"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerInvite from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { name, email, groupId } = parsedInput;

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
        name,
        email,
        ...(groupId && { groupId }),
      },
      userId: user.id,
      skipEnrollmentCheck: true,
      status: "invited",
    });

    waitUntil(
      Promise.allSettled([
        sendEmail({
          subject: `${program.name} invited you to join Dub Partners`,
          from: VARIANT_TO_FROM_MAP.notifications,
          email,
          react: PartnerInvite({
            email,
            program: {
              name: program.name,
              slug: program.slug,
              logo: program.logo,
            },
          }),
        }),

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
