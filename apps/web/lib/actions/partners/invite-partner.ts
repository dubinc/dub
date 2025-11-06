"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getPartnerInviteRewardsAndBounties } from "@/lib/api/partners/get-partner-invite-rewards-and-bounties";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { sanitizeMarkdown } from "@/lib/partners/sanitize-markdown";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import ProgramInvite from "@dub/email/templates/program-invite";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { email, username, groupId, emailSubject, emailTitle, emailBody } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, programEnrollment] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      prisma.programEnrollment.findFirst({
        where: {
          programId,
          partner: {
            email,
          },
        },
      }),
    ]);

    if (programEnrollment) {
      const statusMessages = {
        invited: "has already been invited to",
        approved: "is already enrolled in",
        rejected: "was rejected from",
        declined: "declined the invite to",
        pending: "has a pending application to join",
      };

      const message = statusMessages[programEnrollment.status];

      if (message) {
        throw new Error(`Partner ${email} ${message} this program.`);
      }
    }

    if (!groupId && !program.defaultGroupId) {
      throw new Error("No group ID provided and no default group ID found.");
    }

    const enrolledPartner = await createAndEnrollPartner({
      workspace,
      program,
      partner: {
        email,
        username,
        ...(groupId && { groupId }),
      },
      userId: user.id,
      skipEnrollmentCheck: true,
      status: "invited",
    });

    // Sanitize emailBody before passing to template
    const sanitizedEmailBody = emailBody ? sanitizeMarkdown(emailBody) : null;

    const sendPartnerInvitePromise = (async () => {
      try {
        const rewardsAndBounties = await getPartnerInviteRewardsAndBounties({
          programId,
          groupId: enrolledPartner.groupId || program.defaultGroupId,
        });

        await sendEmail({
          subject:
            emailSubject || `${program.name} invited you to join Dub Partners`,
          variant: "notifications",
          to: email,
          replyTo: program.supportEmail || "noreply",
          react: ProgramInvite({
            email,
            name: enrolledPartner.name,
            program: {
              name: program.name,
              slug: program.slug,
              logo: program.logo,
            },
            ...(emailSubject && { subject: emailSubject }),
            ...(emailTitle && { title: emailTitle }),
            ...(sanitizedEmailBody && { body: sanitizedEmailBody }),
            ...rewardsAndBounties,
          }),
        });
      } catch (error) {
        console.error("Failed to send partner invite email", error);
        try {
          await prisma.programEnrollment.delete({
            where: {
              partnerId_programId: {
                partnerId: enrolledPartner.partnerId || enrolledPartner.id,
                programId,
              },
            },
          });
        } catch (rollbackError) {
          console.error(
            "Failed to rollback partner enrollment after email failure",
            rollbackError,
          );
        }
      }
    })();

    waitUntil(
      Promise.allSettled([
        sendPartnerInvitePromise,
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
      ]),
    );
  });
