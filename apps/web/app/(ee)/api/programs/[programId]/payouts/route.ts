import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/programs/[programId]/payouts - get all payouts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const parsed = payoutsQuerySchema.parse(searchParams);

  const { minPayoutAmount } = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const {
    status,
    partnerId,
    eligibility,
    invoiceId,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = parsed;

  const payouts = await prisma.payout.findMany({
    where: {
      programId,
      ...(status && { status }),
      ...(partnerId && { partnerId }),
      ...(eligibility === "eligible" && {
        amount: {
          gte: minPayoutAmount,
        },
        partner: {
          payoutsEnabledAt: {
            not: null,
          },
        },
      }),
      ...(invoiceId && { invoiceId }),
    },
    include: {
      partner: true,
      user: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  return NextResponse.json(z.array(PayoutResponseSchema).parse(payouts));
});
