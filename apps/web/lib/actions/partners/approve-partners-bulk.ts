"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { bulkApprovePartners } from "@/lib/partners/bulk-approve-partners";
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

    const [program, programEnrollments] = await Promise.all([
      getProgramOrThrow(
        {
          workspaceId: workspace.id,
          programId,
        },
        {
          includeDefaultRewards: true,
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
    ]);

    await bulkApprovePartners({
      workspace,
      program,
      programEnrollments,
      userId: user.id,
    });
  });
