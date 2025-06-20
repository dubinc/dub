"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { qstash } from "@/lib/cron";
import { approvePartnersBulkSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
// A referral link will be created for each partner
export const approvePartnersBulkAction = authActionClient
  .schema(approvePartnersBulkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let { partnerIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: program.id,
        status: "pending",
        partnerId: {
          in: partnerIds,
        },
      },
      select: {
        partnerId: true,
      },
    });

    if (programEnrollments.length === 0) {
      throw new Error("No pending program enrollments found to approve.");
    }

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bulk-approve-partners`,
      body: {
        programId: program.id,
        userId: user.id,
        partnerIds: programEnrollments.map(({ partnerId }) => partnerId),
      },
    });
  });
