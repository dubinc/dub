"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { qstash } from "@/lib/cron";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { canDeletePartner } from "@/lib/partners/utils";
import { prisma } from "@/lib/prisma";
import { deletePartnerSchema } from "@/lib/zod/schemas/partners";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Permanently delete a partner from a program (zero stats only)
export const deletePartnerAction = authActionClient
  .inputSchema(deletePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollmentWhere = {
      programId,
      partnerId,
    };

    const programEnrollment = await getProgramEnrollmentOrThrow({
      ...programEnrollmentWhere,
      include: {
        links: {
          select: {
            clicks: true,
            leads: true,
            sales: true,
            saleAmount: true,
            conversions: true,
          },
        },
      },
    });

    const linkStats = aggregatePartnerLinksStats(programEnrollment.links);

    const canDelete = canDeletePartner({
      ...programEnrollment,
      ...linkStats,
    });

    if (!canDelete) {
      throw new Error(
        "Partner cannot be permanently deleted because it has associated clicks, leads, sales, commissions, or other activity.",
      );
    }

    // Additional check
    const [commissionCount, payoutCount] = await Promise.all([
      prisma.commission.count({
        where: programEnrollmentWhere,
      }),

      prisma.payout.count({
        where: programEnrollmentWhere,
      }),
    ]);

    if (commissionCount > 0 || payoutCount > 0) {
      throw new Error(
        "Partner cannot be permanently deleted because it has associated commissions or payouts.",
      );
    }

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/delete`,
      deduplicationId: `delete-partner-${programId}-${partnerId}`,
      method: "POST",
      body: {
        workspaceId: workspace.id,
        programId,
        partnerId,
        userId: user.id,
      },
    });
  });
