import { DubApiError } from "@/lib/api/errors";
import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { PayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/payouts/[payoutId] - get a single payout by ID
export const GET = withWorkspace(async ({ workspace, params }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { payoutId } = params;

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
      programId,
    },
    include: {
      programEnrollment: true,
      partner: true,
      user: true,
    },
  });

  if (!payout) {
    throw new DubApiError({
      code: "not_found",
      message: `Payout ${payoutId} not found.`,
    });
  }

  const { partner, programEnrollment, ...rest } = payout;

  const mode =
    rest.mode ??
    getEffectivePayoutMode({
      payoutMode: program.payoutMode,
      payoutsEnabledAt: partner.payoutsEnabledAt,
    });

  return NextResponse.json(
    PayoutResponseSchema.parse({
      ...rest,
      mode,
      traceId: rest.stripePayoutTraceId,
      partner: {
        ...partner,
        tenantId: programEnrollment.tenantId,
      },
    }),
  );
});
