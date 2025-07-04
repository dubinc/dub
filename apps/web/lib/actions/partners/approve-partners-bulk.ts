"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkApprovePartners } from "@/lib/partners/bulk-approve-partners";
import { getProgramApplicationRewardsAndDiscount } from "@/lib/partners/get-program-application-rewards";
import { approvePartnersBulkSchema } from "@/lib/zod/schemas/partners";
import { ProgramWithLanderDataSchema } from "@/lib/zod/schemas/programs";
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

    const [program, programEnrollments] = await Promise.all([
      prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          rewards: true,
          discounts: true,
        },
      }),
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
    ]);

    const programWithLanderData = ProgramWithLanderDataSchema.parse(program);

    const { rewards, discount } = getProgramApplicationRewardsAndDiscount({
      rewards: program.rewards,
      discounts: program.discounts,
      program: programWithLanderData,
    });

    await bulkApprovePartners({
      workspace,
      program: programWithLanderData,
      programEnrollments,
      userId: user.id,
      rewards,
      discount,
    });
  });
