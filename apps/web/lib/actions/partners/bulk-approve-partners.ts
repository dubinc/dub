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
export const bulkApprovePartnersAction = authActionClient
  .schema(approvePartnersBulkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { partnerIds } = parsedInput;

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        rewards: true,
        discounts: true,
        partners: {
          where: {
            status: "pending",
            partnerId: {
              in: partnerIds,
            },
          },
          include: {
            partner: true,
          },
        },
      },
    });

    const programWithLanderData = ProgramWithLanderDataSchema.parse(program);

    const { rewards, discount } =
      getProgramApplicationRewardsAndDiscount(program);

    await bulkApprovePartners({
      workspace,
      program: programWithLanderData,
      programEnrollments: program.partners,
      rewards,
      discount,
      user,
    });
  });
