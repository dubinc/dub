"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkApprovePartners } from "@/lib/partners/bulk-approve-partners";
import { bulkApprovePartnersSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
// A referral link will be created for each partner
export const bulkApprovePartnersAction = authActionClient
  .schema(bulkApprovePartnersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerIds, groupId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partners: programEnrollments, ...program } =
      await prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          partners: {
            where: {
              status: "pending",
              partnerId: {
                in: partnerIds,
              },
            },
          },
        },
      });

    await bulkApprovePartners({
      workspace,
      program,
      programEnrollments,
      user,
      groupId,
    });
  });
