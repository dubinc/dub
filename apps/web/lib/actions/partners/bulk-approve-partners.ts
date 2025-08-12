"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { bulkApprovePartners } from "@/lib/partners/bulk-approve-partners";
import { bulkApprovePartnersSchema } from "@/lib/zod/schemas/partners";
import { ProgramWithLanderDataSchema } from "@/lib/zod/schemas/programs";
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
            partner: {
              include: {
                users: {
                  where: {
                    notificationPreferences: {
                      applicationApproved: true,
                    },
                  },
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const programWithLanderData = ProgramWithLanderDataSchema.parse(program);

    if (!groupId && !program.defaultGroupId) {
      throw new Error("No group ID provided and no default group ID found.");
    }

    await bulkApprovePartners({
      workspace,
      program: programWithLanderData,
      programEnrollments: program.partners,
      user,
      groupId: groupId || program.defaultGroupId!,
    });
  });
