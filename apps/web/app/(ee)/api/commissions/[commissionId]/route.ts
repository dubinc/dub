import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { updatePartnerCommission } from "@/lib/api/commissions/update-partner-commission";
import { transformCustomerForCommission } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  CommissionDetailSchema,
  CommissionEnrichedSchema,
  updateCommissionSchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/commissions/:commissionId - get a single commission by ID
export const GET = withWorkspace(async ({ workspace, params }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { commissionId } = params;

  const commission = await prisma.commission.findUnique({
    where: {
      id: commissionId,
      programId,
    },
    include: {
      partner: true,
      programEnrollment: {
        select: {
          partnerGroup: {
            select: {
              id: true,
              holdingPeriodDays: true,
            },
          },
        },
      },
      customer: true,
      reward: {
        select: {
          description: true,
          type: true,
          event: true,
          amountInCents: true,
          amountInPercentage: true,
        },
      },
      user: true,
      payout: {
        select: {
          id: true,
          paidAt: true,
          initiatedAt: true,
          user: true,
        },
      },
    },
  });

  if (!commission) {
    throw new DubApiError({
      code: "not_found",
      message: `Commission ${commissionId} not found.`,
    });
  }

  const { partner, programEnrollment, customer, reward, ...rest } = commission;

  return NextResponse.json(
    CommissionDetailSchema.parse({
      ...rest,
      partner: {
        ...partner,
        groupId: programEnrollment.partnerGroup?.id ?? null,
      },
      customer: transformCustomerForCommission(customer),
      reward: reward
        ? {
            ...reward,
            amountInPercentage: reward.amountInPercentage
              ? Number(reward.amountInPercentage)
              : null,
          }
        : null,
      holdingPeriodDays:
        rest.type === "custom"
          ? 0
          : programEnrollment.partnerGroup?.holdingPeriodDays ?? 0,
    }),
  );
});

// PATCH /api/commissions/:commissionId - update a commission
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { commissionId } = params;

    const {
      saleAmount,
      modifySaleAmount,
      earnings,
      currency,
      status,
      // Deprecated fields
      amount,
      modifyAmount,
    } = updateCommissionSchema.parse(await parseRequestBody(req));

    const updatedCommission = await updatePartnerCommission({
      programId,
      commissionId,
      saleAmount: saleAmount ?? amount,
      modifySaleAmount: modifySaleAmount ?? modifyAmount,
      currency,
      status,
      earnings,
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "commission.updated",
          description: `Commission ${commissionId} updated`,
          actor: session.user,
          targets: [
            {
              type: "commission",
              id: commissionId,
              metadata: updatedCommission,
            },
          ],
        }),
      ]),
    );

    return NextResponse.json(
      CommissionEnrichedSchema.parse({
        ...updatedCommission,
        customer: transformCustomerForCommission(updatedCommission.customer),
      }),
    );
  },
  {
    requiredRoles: ["owner", "member"],
  },
);
