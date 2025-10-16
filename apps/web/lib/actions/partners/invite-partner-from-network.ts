"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getNetworkInvitesUsage } from "@/lib/api/partners/get-network-invites-usage";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { invitePartnerFromNetworkSchema } from "@/lib/zod/schemas/partner-network";
import { sendEmail } from "@dub/email";
import ProgramNetworkInvite from "@dub/email/templates/program-network-invite";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

export const invitePartnerFromNetworkAction = authActionClient
  .schema(invitePartnerFromNetworkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;

    const networkInvitesUsage = await getNetworkInvitesUsage(workspace);

    if (networkInvitesUsage >= workspace.networkInvitesLimit)
      throw new Error(
        "You have reached your partner network invitations limit.",
      );

    const { partnerId, groupId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, partner] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      prisma.partner.findFirst({
        where: {
          id: partnerId,
          programs: {
            none: {
              programId,
            },
          },
        },
      }),
    ]);

    if (!partner || !partner.email)
      throw new Error("Partner not found or already enrolled in this program.");

    if (!groupId && !program.defaultGroupId)
      throw new Error("No group ID provided and no default group ID found.");

    const enrolledPartner = await createAndEnrollPartner({
      workspace,
      program,
      partner: {
        email: partner.email,
        ...(groupId && { groupId }),
      },
      userId: user.id,
      skipEnrollmentCheck: true,
      status: "invited",
    });

    await prisma.discoveredPartner.upsert({
      where: {
        programId_partnerId: {
          programId,
          partnerId,
        },
      },
      create: {
        id: createId({ prefix: "dpn_" }),
        programId,
        partnerId,
        invitedAt: new Date(),
      },
      update: {
        invitedAt: new Date(),
      },
    });

    waitUntil(
      Promise.allSettled([
        sendEmail({
          subject: `${program.name} invited you to join on Dub Partners`,
          variant: "notifications",
          to: partner.email,
          react: ProgramNetworkInvite({
            email: partner.email,
            name: partner.name,
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
          description: `Partner ${enrolledPartner.id} invited from network`,
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
