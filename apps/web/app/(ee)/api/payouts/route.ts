import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, PayoutStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/payouts - get all payouts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const isHoldStatus = searchParams.status === "hold";
  const { status: _status, ...restSearchParams } = searchParams;

  let { status, partnerId, invoiceId, sortBy, sortOrder, page, pageSize } =
    payoutsQuerySchema.parse(isHoldStatus ? restSearchParams : searchParams);

  if (isHoldStatus) {
    status = PayoutStatus.pending;
  }

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const payouts = await prisma.payout.findMany({
    where: {
      programId,
      ...(status && { status }),
      ...(partnerId && { partnerId }),
      ...(invoiceId && { invoiceId }),
      ...(isHoldStatus && {
        programEnrollment: {
          fraudEventGroups: {
            some: {
              status: FraudEventStatus.pending,
            },
          },
        },
      }),
    },
    include: {
      programEnrollment: true,
      partner: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const transformedPayouts = payouts.map(
    ({ partner, programEnrollment, ...payout }) => {
      const mode =
        payout.mode ??
        getEffectivePayoutMode({
          payoutMode: program.payoutMode,
          payoutsEnabledAt: partner.payoutsEnabledAt,
        });

      return {
        ...payout,
        mode,
        partner: {
          ...partner,
          tenantId: programEnrollment.tenantId,
        },
      };
    },
  );

  return NextResponse.json(
    z.array(PayoutResponseSchema).parse(transformedPayouts),
  );
});
