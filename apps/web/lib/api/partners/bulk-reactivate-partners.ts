import { sendBatchEmail } from "@dub/email";
import PartnerReactivated from "@dub/email/templates/partner-reactivated";
import { prisma } from "@dub/prisma";
import { Partner, Program, ProgramEnrollment } from "@dub/prisma/client";
import { linkCache } from "../links/cache";

type ProgramEnrollmentWithPartner = Pick<
  ProgramEnrollment,
  "id" | "partnerId" | "groupId"
> & {
  partner: Pick<Partner, "id" | "name" | "email">;
};

interface BulkReactivatePartnersParams {
  program: Pick<
    Program,
    "id" | "name" | "slug" | "workspaceId" | "defaultGroupId" | "supportEmail"
  >;
  programEnrollments: ProgramEnrollmentWithPartner[];
}

export async function bulkReactivatePartners({
  program,
  programEnrollments,
}: BulkReactivatePartnersParams) {
  if (programEnrollments.length === 0) {
    return;
  }

  const partnerIds = programEnrollments.map((e) => e.partnerId);

  // Resolve effective groupId per enrollment (fall back to program default)
  const resolvedGroupIds = programEnrollments.map(
    (e) => e.groupId || program.defaultGroupId,
  );

  // Find the groups
  const groups = await prisma.partnerGroup.findMany({
    where: {
      id: {
        in: [...new Set(resolvedGroupIds.filter(Boolean))],
      },
    },
    select: {
      id: true,
      clickRewardId: true,
      leadRewardId: true,
      saleRewardId: true,
      discountId: true,
    },
  });

  // Build a map from resolved groupId -> partnerIds
  const partnerIdsByGroupId = new Map<string, string[]>();

  for (const enrollment of programEnrollments) {
    const groupId = enrollment.groupId || program.defaultGroupId;

    if (!groupId) {
      continue;
    }

    const partnerIds = partnerIdsByGroupId.get(groupId) || [];
    partnerIds.push(enrollment.partnerId);
    partnerIdsByGroupId.set(groupId, partnerIds);
  }

  // Un-expire all links
  await prisma.link.updateMany({
    where: {
      programId: program.id,
      partnerId: {
        in: partnerIds,
      },
    },
    data: {
      expiresAt: null,
    },
  });

  // Find all links and expire cache
  const allLinks = await prisma.link.findMany({
    where: {
      programId: program.id,
      partnerId: {
        in: partnerIds,
      },
    },
    select: {
      domain: true,
      key: true,
    },
  });

  await linkCache.expireMany(allLinks);

  // Update enrollments per group to restore rewards
  const groupsById = new Map(groups.map((g) => [g.id, g]));

  for (const [groupId, groupPartnerIds] of partnerIdsByGroupId) {
    const group = groupsById.get(groupId);

    if (!group) {
      continue;
    }

    await prisma.programEnrollment.updateMany({
      where: {
        programId: program.id,
        partnerId: {
          in: groupPartnerIds,
        },
        status: "deactivated",
      },
      data: {
        status: "approved",
        groupId,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
      },
    });
  }

  // Send email notifications
  const emailResponse = await sendBatchEmail(
    programEnrollments.map(({ partner }) => ({
      variant: "notifications",
      subject: `The ${program.name} program has been reactivated`,
      to: partner.email!,
      replyTo: program.supportEmail || "noreply",
      react: PartnerReactivated({
        partner: {
          name: partner.name,
          email: partner.email!,
        },
        program: {
          name: program.name,
          slug: program.slug,
        },
      }),
    })),
  );

  console.log("[bulkReactivatePartners] Sent notification emails.", {
    response: emailResponse,
  });
}
