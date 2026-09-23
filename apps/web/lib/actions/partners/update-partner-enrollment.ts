"use server";

import { trackPartnerRewardOverrideLog } from "@/lib/api/activity-log/track-reward-overrides";
import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { notifyPartnerRewardOverride } from "@/lib/api/partners/notify-partner-reward-change";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { throwIfExistingTenantEnrollmentExists } from "@/lib/api/partners/throw-if-existing-tenant-id-exists";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import {
  hasRewardAssignment,
  hasRewardIdsInput,
} from "@/lib/api/rewards/reward-overrides";
import { throwIfInvalidRewards } from "@/lib/api/rewards/throw-if-invalid-rewards";
import { remapDiscountCodes } from "@/lib/discounts/remap-discount-codes";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PARTNER_LEVEL_REWARDS_PLAN_ERROR } from "@/lib/rewards/constants";
import { recordLink } from "@/lib/tinybird";
import { rewardActivityDescriptionSchema } from "@/lib/zod/schemas/rewards";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const updatePartnerEnrollmentSchema = z
  .object({
    workspaceId: z.string(),
    partnerId: z.string(),
    tenantId: z.string().nullable().optional(),
    customerDataSharingEnabledAt: z.coerce.date().nullable().optional(),
    groupMoveDisabledAt: z.coerce.date().nullable().optional(),
    riskMonitoringDisabledAt: z.coerce.date().nullable().optional(),
    clickRewardId: z.string().nullish(),
    leadRewardId: z.string().nullish(),
    saleRewardId: z.string().nullish(),
    discountId: z.string().nullish(),
  })
  .extend(rewardActivityDescriptionSchema.shape)
  .refine(
    (data) =>
      [
        data.tenantId,
        data.customerDataSharingEnabledAt,
        data.groupMoveDisabledAt,
        data.riskMonitoringDisabledAt,
        data.clickRewardId,
        data.leadRewardId,
        data.saleRewardId,
        data.discountId,
      ].some((value) => value !== undefined),
    {
      message: "At least one enrollment field must be provided.",
    },
  );

// Update a partner's program enrollment data
export const updatePartnerEnrollmentAction = authActionClient
  .inputSchema(updatePartnerEnrollmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      workspaceId,
      partnerId,
      tenantId,
      customerDataSharingEnabledAt,
      groupMoveDisabledAt,
      riskMonitoringDisabledAt,
      activityDescription,
      ...rewardIds
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    if (
      hasRewardAssignment(rewardIds) &&
      !getPlanCapabilities(workspace.plan).canUseAdvancedRewardLogic
    ) {
      throw new Error(PARTNER_LEVEL_REWARDS_PLAN_ERROR);
    }

    const {
      partner,
      tenantId: existingTenantId,
      groupId,
      groupMoveDisabledAt: existingGroupMoveDisabledAt,
      clickRewardId: existingClickRewardId,
      leadRewardId: existingLeadRewardId,
      saleRewardId: existingSaleRewardId,
      discountId: existingDiscountId,
    } = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: true,
      },
    });

    const where = {
      programId,
      partnerId,
    };

    if (tenantId && tenantId !== existingTenantId) {
      await throwIfExistingTenantEnrollmentExists({
        tenantId,
        programId,
      });
    }

    await throwIfInvalidRewards({
      programId,
      groupId,
      ...rewardIds,
    });

    const { clickRewardId, leadRewardId, saleRewardId, discountId } = rewardIds;

    const enrollmentData: Prisma.ProgramEnrollmentUpdateInput = {
      ...(tenantId !== undefined && { tenantId }),
      ...(customerDataSharingEnabledAt !== undefined && {
        customerDataSharingEnabledAt,
      }),
      ...(groupMoveDisabledAt !== undefined && { groupMoveDisabledAt }),
      ...(riskMonitoringDisabledAt !== undefined && {
        riskMonitoringDisabledAt,
      }),
      ...(clickRewardId !== undefined && { clickRewardId }),
      ...(leadRewardId !== undefined && { leadRewardId }),
      ...(saleRewardId !== undefined && { saleRewardId }),
      ...(discountId !== undefined && { discountId }),
      ...(hasRewardAssignment(rewardIds) &&
        !existingGroupMoveDisabledAt && {
          groupMoveDisabledAt: new Date(),
        }),
    };

    const programEnrollment = await prisma.$transaction(async (tx) => {
      if (tenantId !== undefined) {
        await tx.link.updateMany({
          where,
          data: {
            tenantId,
          },
        });
      }

      const enrollment = await tx.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: enrollmentData,
        include: {
          links: {
            include: {
              ...includeTags,
              ...includeProgramEnrollment,
            },
          },
        },
      });

      await trackPartnerRewardOverrideLog({
        workspaceId: workspace.id,
        programId,
        partnerId,
        userId: user.id,
        description: activityDescription,
        previous: {
          clickRewardId: existingClickRewardId,
          leadRewardId: existingLeadRewardId,
          saleRewardId: existingSaleRewardId,
          discountId: existingDiscountId,
        },
        next: {
          clickRewardId: enrollment.clickRewardId,
          leadRewardId: enrollment.leadRewardId,
          saleRewardId: enrollment.saleRewardId,
          discountId: enrollment.discountId,
        },
        tx,
      });

      return enrollment;
    });

    if (discountId !== undefined) {
      await remapDiscountCodes({
        programId,
        partnerId,
      });
    }

    waitUntil(
      Promise.allSettled([
        ...(tenantId !== undefined
          ? [recordLink(programEnrollment.links)]
          : []),

        ...(hasRewardIdsInput(rewardIds)
          ? [linkCache.expireMany(programEnrollment.links)]
          : []),

        // Queue an index update because the tenant ID changed
        ...(tenantId !== undefined && tenantId !== existingTenantId
          ? [queuePartnerSearchSync({ enrollmentIds: [programEnrollment.id] })]
          : []),

        notifyPartnerRewardOverride({
          programId,
          partnerId,
          previous: {
            clickRewardId: existingClickRewardId,
            leadRewardId: existingLeadRewardId,
            saleRewardId: existingSaleRewardId,
          },
          next: {
            clickRewardId: programEnrollment.clickRewardId,
            leadRewardId: programEnrollment.leadRewardId,
            saleRewardId: programEnrollment.saleRewardId,
          },
          activityDescription,
        }),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "partner.enrollment_updated",
          description: `Partner ${partnerId} enrollment updated`,
          actor: user,
          targets: [
            {
              type: "partner",
              id: partnerId,
              metadata: partner,
            },
          ],
        }),
      ]),
    );
  });
