"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { getPartnerInviteRewardsAndBounties } from "@/lib/api/partners/get-partner-invite-rewards-and-bounties";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { bulkInvitePartnersSchema } from "@/lib/zod/schemas/partners";
import { sendBatchEmail } from "@dub/email";
import ProgramInvite from "@dub/email/templates/program-invite";
import { prisma } from "@dub/prisma";
import { prettyPrint } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

export const bulkInvitePartnersAction = authActionClient
  .inputSchema(bulkInvitePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { groupId, emails } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const uniqueRecipientEmails = [...new Set(emails)];

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
      include: {
        groups: {
          where: groupId
            ? { id: groupId }
            : { slug: DEFAULT_PARTNER_GROUP.slug },
          include: {
            partnerGroupDefaultLinks: true,
            utmTemplate: true,
          },
        },
        partners: {
          where: {
            partner: {
              email: {
                in: uniqueRecipientEmails,
              },
            },
          },
        },
        emailDomains: {
          where: {
            status: "verified",
          },
        },
      },
    });

    if (program.partners.length > 0) {
      throw new Error("Some partners are already enrolled in this program.");
    }

    if (program.groups.length === 0) {
      throw new Error("Invalid group ID provided.");
    }

    const group = program.groups[0];

    const { count: createdPartnersCount } = await prisma.partner.createMany({
      data: uniqueRecipientEmails.map((email) => ({
        id: createId({ prefix: "pn_" }),
        email,
        name: email,
      })),
      skipDuplicates: true,
    });

    console.log(
      `Created ${createdPartnersCount} out of ${uniqueRecipientEmails.length} provided partners (${uniqueRecipientEmails.length - createdPartnersCount} already exist on Dub)`,
    );

    const partners = await prisma.partner.findMany({
      where: {
        email: {
          in: uniqueRecipientEmails,
        },
      },
    });

    const { count: invitedCount } = await prisma.programEnrollment.createMany({
      data: partners.map((partner) => ({
        id: createId({ prefix: "pge_" }),
        programId,
        partnerId: partner.id,
        status: "invited",
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
      })),
      skipDuplicates: true,
    });

    console.log(
      `Created ${invitedCount} program enrollments with status "invited"`,
    );

    // TODO: create default links for the partners

    waitUntil(
      (async () => {
        // Use saved invite email data from program if available
        const inviteEmailData = program.inviteEmailData;

        const rewardsAndBounties = await getPartnerInviteRewardsAndBounties({
          programId,
          groupId: groupId || program.defaultGroupId,
        });

        const { data: resendData } = await sendBatchEmail(
          uniqueRecipientEmails.map((email) => ({
            subject:
              inviteEmailData?.subject ||
              `${program.name} invited you to join Dub Partners`,
            variant: "notifications",
            // use the first verified email domain as the from email address
            from:
              program.emailDomains.length > 0
                ? `${program.name} <partners@${program.emailDomains[0].slug}>`
                : undefined,
            to: email,
            replyTo: program.supportEmail || "noreply",
            react: ProgramInvite({
              email,
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
          })),
        );

        console.log(
          `Sent invitation emails to ${uniqueRecipientEmails.length} partners. ${prettyPrint(resendData)}`,
        );

        await recordAuditLog(
          partners.map((partner) => ({
            workspaceId: workspace.id,
            programId,
            action: "partner.invited",
            description: `Partner ${partner.id} invited`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: partner.id,
                metadata: partner,
              },
            ],
          })),
        );
      })(),
    );

    return { invitedCount };
  });
