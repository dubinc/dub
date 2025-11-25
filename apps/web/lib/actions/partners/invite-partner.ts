"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getPartnerInviteRewardsAndBounties } from "@/lib/api/partners/get-partner-invite-rewards-and-bounties";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
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
    const { email, username, name, groupId } = parsedInput;

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
        name,
        ...(groupId && { groupId }),
      },
      userId: user.id,
      skipEnrollmentCheck: true,
      status: "invited",
    });

    // Use saved invite email data from program if available
    const inviteEmailData = program.inviteEmailData;

    const sendPartnerInvitePromise = (async () => {
      try {
        const rewardsAndBounties = await getPartnerInviteRewardsAndBounties({
          programId,
          groupId: enrolledPartner.groupId || program.defaultGroupId,
        });

        await sendEmail({
          subject:
            inviteEmailData?.subject ||
            `${program.name} invited you to join Dub Partners`,
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
