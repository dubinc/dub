"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { createId } from "@/lib/api/create-id";
import { bulkCreateLinks } from "@/lib/api/links";
import { getPartnerInviteRewardsAndBounties } from "@/lib/api/partners/get-partner-invite-rewards-and-bounties";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { bulkInvitePartnersSchema } from "@/lib/zod/schemas/partners";
import { sendBatchEmail } from "@dub/email";
import ProgramInvite from "@dub/email/templates/program-invite";
import { prisma } from "@dub/prisma";
import { constructURLFromUTMParams, nanoid } from "@dub/utils";
import { prettyPrint } from "@dub/utils/src";
import slugify from "@sindresorhus/slugify";
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
          include: {
            partner: {
              select: {
                email: true,
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

    const alreadyEnrolledEmails = new Set(
      program.partners.map((p) => p.partner.email).filter(Boolean),
    );

    // Filter out emails that are already enrolled
    const emailsToInvite = uniqueRecipientEmails.filter(
      (email) => !alreadyEnrolledEmails.has(email),
    );

    if (emailsToInvite.length === 0) {
      return {
        invitedCount: 0,
        skippedCount: alreadyEnrolledEmails.size,
      };
    }

    if (program.groups.length === 0) {
      throw new Error("Invalid group ID provided.");
    }

    const { count: createdPartnersCount } = await prisma.partner.createMany({
      data: emailsToInvite.map((email) => ({
        id: createId({ prefix: "pn_" }),
        email,
        name: email,
      })),
      skipDuplicates: true,
    });

    console.log(
      `Created ${createdPartnersCount} out of ${emailsToInvite.length} provided partners (${emailsToInvite.length - createdPartnersCount} already exist on Dub)`,
    );

    // Fetch the created partners
    const partners = await prisma.partner.findMany({
      where: {
        email: {
          in: emailsToInvite,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const group = program.groups[0];
    const partnerGroupDefaultLinks = group.partnerGroupDefaultLinks;
    const utmTemplate = group.utmTemplate;

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

    waitUntil(
      (async () => {
        // Create default links for the partners for each group default link
        for (const partnerGroupDefaultLink of partnerGroupDefaultLinks) {
          const links = await bulkCreateLinks({
            links: partners.map((partner) => ({
              domain: partnerGroupDefaultLink.domain,
              key: `${slugify(partner.email!.split("@")[0])}-${nanoid(4)}`,
              url: constructURLFromUTMParams(
                partnerGroupDefaultLink.url,
                extractUtmParams(utmTemplate),
              ),
              ...extractUtmParams(utmTemplate, { excludeRef: true }),
              projectId: workspace.id,
              programId: program.id,
              partnerId: partner.id,
              userId: user.id,
              folderId: program.defaultFolderId,
              partnerGroupDefaultLinkId: partnerGroupDefaultLink.id,
            })),
          });

          console.log(
            `Created ${links.length} links for the partner for the default link ${partnerGroupDefaultLink.id}`,
          );
        }

        const rewardsAndBounties = await getPartnerInviteRewardsAndBounties({
          programId,
          groupId: groupId || program.defaultGroupId,
        });

        const inviteEmailData = program.inviteEmailData;
        const emailDomains = program.emailDomains;

        const { data: resendData } = await sendBatchEmail(
          partners.map((partner) => ({
            subject:
              inviteEmailData?.subject ||
              `${program.name} invited you to join Dub Partners`,
            variant: "notifications",
            from:
              emailDomains.length > 0
                ? `${program.name} <partners@${emailDomains[0].slug}>`
                : undefined,
            to: partner.email!,
            replyTo: program.supportEmail || "noreply",
            react: ProgramInvite({
              email: partner.email!,
              name: partner.name,
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
          `Sent invitation emails to ${emailsToInvite.length} partners. ${prettyPrint(resendData)}`,
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

    return {
      invitedCount,
      skippedCount: alreadyEnrolledEmails.size,
    };
  });
