"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getPartnerInviteRewardsAndBounties } from "@/lib/api/partners/get-partner-invite-rewards-and-bounties";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { MAX_PARTNERS_INVITES_PER_REQUEST } from "@/lib/constants/program";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import ProgramInvite from "@dub/email/templates/program-invite";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const invitePartnerAction = authActionClient
  .inputSchema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { email, emails, username, name, groupId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const recipientEmails = [email, ...(emails || [])]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const uniqueRecipientEmails = [...new Set(recipientEmails)];

    if (uniqueRecipientEmails.length === 0) {
      throw new Error("Please provide at least one partner email.");
    }
    if (uniqueRecipientEmails.length > MAX_PARTNERS_INVITES_PER_REQUEST) {
      throw new Error(
        `You can invite up to ${MAX_PARTNERS_INVITES_PER_REQUEST} partners at once.`,
      );
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, existingProgramEnrollments] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
        include: {
          emailDomains: {
            where: {
              status: "verified",
            },
          },
        },
      }),

      prisma.programEnrollment.findMany({
        where: {
          programId,
          partner: {
            email: {
              in: uniqueRecipientEmails,
            },
          },
        },
        include: {
          partner: true,
        },
      }),
    ]);

    const existingEnrollmentByEmail = new Map(
      existingProgramEnrollments.flatMap((programEnrollment) => {
        if (!programEnrollment.partner.email) {
          return [];
        }

        return [
          [programEnrollment.partner.email.toLowerCase(), programEnrollment],
        ];
      }),
    );

    const statusMessages = {
      invited: "has already been invited to",
      approved: "is already enrolled in",
      rejected: "was rejected from",
      declined: "declined the invite to",
      pending: "has a pending application to join",
      banned: "is banned from",
      archived: "is archived in",
      deactivated: "is deactivated in",
    } as const;

    for (const recipientEmail of uniqueRecipientEmails) {
      const existingProgramEnrollment =
        existingEnrollmentByEmail.get(recipientEmail);
      const message =
        existingProgramEnrollment &&
        statusMessages[existingProgramEnrollment.status];

      if (message) {
        throw new Error(`Partner ${recipientEmail} ${message} this program.`);
      }
    }

    if (!groupId && !program.defaultGroupId) {
      throw new Error("No group ID provided and no default group ID found.");
    }

    const isBulkInvite = uniqueRecipientEmails.length > 1;
    const enrolledPartners: {
      enrolledPartner: Awaited<ReturnType<typeof createAndEnrollPartner>>;
      recipientEmail: string;
    }[] = [];
    const errors: { recipientEmail: string; error: string }[] = [];

    // Use saved invite email data from program if available
    const inviteEmailData = program.inviteEmailData;

    const createPostInvitePromises = () => {
      const sendPartnerInvitePromises = enrolledPartners.map(
        async ({ enrolledPartner, recipientEmail }) => {
          try {
            const rewardsAndBounties = await getPartnerInviteRewardsAndBounties(
              {
                programId,
                groupId: enrolledPartner.groupId || program.defaultGroupId,
              },
            );

            await sendEmail({
              subject:
                inviteEmailData?.subject ||
                `${program.name} invited you to join Dub Partners`,
              variant: "notifications",
              // use the first verified email domain as the from email address
              from:
                program.emailDomains.length > 0
                  ? `${program.name} <partners@${program.emailDomains[0].slug}>`
                  : undefined,
              to: recipientEmail,
              replyTo: program.supportEmail || "noreply",
              react: ProgramInvite({
                email: recipientEmail,
                name: enrolledPartner.name,
                program: {
                  name: program.name,
                  slug: program.slug,
                  logo: program.logo,
                },
                ...(inviteEmailData?.subject && {
                  subject: inviteEmailData.subject,
                }),
                ...(inviteEmailData?.title && { title: inviteEmailData.title }),
                ...(inviteEmailData?.body && { body: inviteEmailData.body }),
                ...rewardsAndBounties,
              }),
            });
          } catch (error) {
            console.error("Failed to send partner invite email", {
              error,
              partnerId: enrolledPartner.partnerId || enrolledPartner.id,
              programId,
            });
          }
        },
      );

      const recordAuditLogPromises = enrolledPartners.map(
        ({ enrolledPartner }) =>
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "partner.invited",
            description: `Partner ${enrolledPartner.id} invited`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: enrolledPartner.id,
                metadata: enrolledPartner,
              },
            ],
          }),
      );

      return [...sendPartnerInvitePromises, ...recordAuditLogPromises];
    };

    for (const recipientEmail of uniqueRecipientEmails) {
      try {
        const enrolledPartner = await createAndEnrollPartner({
          workspace,
          program,
          partner: {
            email: recipientEmail,
            ...(isBulkInvite ? {} : { username, name }),
            ...(groupId && { groupId }),
          },
          userId: user.id,
          skipEnrollmentCheck: true,
          status: "invited",
        });

        enrolledPartners.push({ enrolledPartner, recipientEmail });
      } catch (error) {
        errors.push({
          recipientEmail,
          error: error instanceof Error ? error.message : "Failed to invite",
        });
      }
    }

    if (enrolledPartners.length > 0) {
      const postInvitePromises = createPostInvitePromises();
      waitUntil(Promise.allSettled(postInvitePromises));
    }

    return {
      invitedCount: enrolledPartners.length,
      invited: enrolledPartners,
      errors,
    };
  });
