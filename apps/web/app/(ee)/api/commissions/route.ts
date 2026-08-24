import { createManualCommissions } from "@/lib/api/commissions/create-manual-commissions";
import { getCommissions } from "@/lib/api/commissions/get-commissions";
import { transformCustomerForCommission } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createCommissionFingerprintPayload } from "@/lib/idempotency/create-commission-fingerprint";
import { createFingerprint } from "@/lib/idempotency/create-fingerprint";
import { resolveIdempotencyKey } from "@/lib/idempotency/resolve-idempotency-key";
import { withIdempotency } from "@/lib/idempotency/with-idempotency";
import { prisma } from "@/lib/prisma";
import {
  CommissionEnrichedSchema,
  createCommissionResponseSchema,
  createManualCommissionBodySchema,
  getCommissionsQuerySchema,
} from "@/lib/zod/schemas/commissions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/commissions - get all commissions for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  let { partnerId, tenantId, ...filters } = getCommissionsQuerySchema
    .extend({
      fraudEventGroupId: z.string().optional(),
      type: z.string().optional(), // May be comma-separated string, for multi-value handling
    })
    .parse(searchParams);

  if (tenantId && !partnerId) {
    const partner = await prisma.programEnrollment.findUnique({
      where: {
        tenantId_programId: {
          tenantId,
          programId,
        },
      },
      select: {
        partnerId: true,
      },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: `Partner with specified tenantId ${tenantId} not found.`,
      });
    }

    partnerId = partner.partnerId;
  }

  const commissions = await getCommissions({
    ...filters,
    partnerId,
    programId,
  });

  return NextResponse.json(
    z.array(CommissionEnrichedSchema).parse(
      commissions.map((c) => ({
        ...c,
        paidAt: c.payout?.paidAt ?? null,
        customer: transformCustomerForCommission(c.customer),
        partner: {
          ...c.partner,
          groupId: c.programEnrollment.groupId,
        },
      })),
    ),
  );
});

// POST /api/commissions - create manual commission
export const POST = withWorkspace(
  async ({ workspace, session, req, idempotencyKey }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const body = createManualCommissionBodySchema.parse(
      await parseRequestBody(req),
    );

    const invoiceId = body.type === "sale" ? body.invoiceId : null;
    const key = resolveIdempotencyKey({
      headerKey: idempotencyKey,
      invoiceId,
    });

    const { responseStatus, responseBody } = await withIdempotency({
      namespace: "createCommission",
      workspaceId: workspace.id,
      key,
      fingerprint: createFingerprint(createCommissionFingerprintPayload(body)),
      fn: async () => {
        await createManualCommissions({
          ...body,
          workspace,
          programId,
          user: session.user,
        });

        const isClawback = body.type === "custom" && body.amount < 0;

        return {
          responseStatus: 202,
          responseBody: createCommissionResponseSchema.parse({
            success: true,
            message: isClawback
              ? "A clawback has been queued for the partner!"
              : "Your commissions are being created and will appear shortly.",
          }),
        };
      },
    });

    return NextResponse.json(responseBody, {
      status: responseStatus,
    });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
