"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { getGroupRewardsAndBounties } from "@/lib/api/partners/get-group-rewards-and-bounties";
import { getNetworkInvitesUsage } from "@/lib/api/partners/get-network-invites-usage";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import { invitePartnerFromNetworkSchema } from "@/lib/zod/schemas/partner-network";
import { sendEmail } from "@dub/email";
import ProgramInvite from "@dub/email/templates/program-invite";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { getProgramNetworkInviteEmailDefaults } from "../../network/get-program-network-invite-email-defaults";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const invitePartnerFromNetworkAction = authActionClient
  .inputSchema(invitePartnerFromNetworkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const networkInvitesUsage = await getNetworkInvitesUsage(workspace);

    if (networkInvitesUsage >= workspace.networkInvitesLimit) {
      throw new Error(
        "You have reached your partner network invitations limit.",
      );
    }

    const {
      partnerId,
      groupId,
      username,
      emailSubject,
      emailTitle,
      emailBody,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, partner] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      prisma.partner.findFirst({
        where: {
          id: partnerId,
          networkStatus: {
            in: ["approved", "trusted"],
          },
          programs: {
            none: {
              programId,
            },
          },
        },
      }),
    ]);

    if (!program.partnerNetworkEnabledAt) {
      throw new Error("Partner network is not enabled for this program.");
    }

    if (!partner || !partner.email)
      throw new Error("Partner not found or already enrolled in this program.");

    const enrolledPartner = await createAndEnrollPartner({
      workspace,
      program,
      partner: {
        email: partner.email,
        name: partner.name,
        image: partner.image,
        username: username || undefined,
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
        ignoredAt: null,
      },
    });

    waitUntil(
      Promise.allSettled([
        (async () => {
          if (!partner.email) return;
          const { rewards, bounties } = await getGroupRewardsAndBounties({
            programId,
            groupId: enrolledPartner.groupId || program.defaultGroupId,
          });
          const emailDefaults = getProgramNetworkInviteEmailDefaults({
            programName: program.name,
            partnerName: partner.name,
          });

          await sendEmail({
            subject: emailSubject || emailDefaults.subject,
            variant: "notifications",
            to: partner.email,
            react: ProgramInvite({
              email: partner.email,
              name: partner.name,
              program: {
                name: program.name,
                slug: program.slug,
                logo: program.logo,
                website: program.url,
              },
              rewards,
              bounties,
              subject: emailSubject || emailDefaults.subject,
              title: emailTitle || emailDefaults.title,
              body: emailBody || emailDefaults.body,
            }),
          });
        })(),

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
