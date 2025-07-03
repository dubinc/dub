"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { bulkApprovePartners } from "@/lib/partners/bulk-approve-partners";
import { getProgramApplicationRewardsAndDiscount } from "@/lib/partners/get-program-application-rewards";
import { approvePartnersBulkSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
// A referral link will be created for each partner
export const approvePartnersBulkAction = authActionClient
  .schema(approvePartnersBulkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let { partnerIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, programEnrollments, allRewards, allDiscounts] =
      await Promise.all([
        getProgramOrThrow(
          {
            workspaceId: workspace.id,
            programId,
          },
          {
            includeDefaultRewards: true,
            includeLanderData: true,
          },
        ),
        prisma.programEnrollment.findMany({
          where: {
            programId: programId,
            status: "pending",
            partnerId: {
              in: partnerIds,
            },
          },
          include: {
            partner: true,
          },
        }),

        prisma.reward.findMany({
          where: {
            programId,
          },
        }),

        prisma.discount.findMany({
          where: {
            programId,
          },
        }),
      ]);

    const { rewards, discount } = getProgramApplicationRewardsAndDiscount({
      program,
      rewards: allRewards,
      discounts: allDiscounts,
    });

    await bulkApprovePartners({
      workspace,
      program,
      programEnrollments,
      userId: user.id,
      rewards,
      discount,
    });
  });
