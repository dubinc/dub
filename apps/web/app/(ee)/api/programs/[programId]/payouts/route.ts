import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/payouts - get all payouts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { status, partnerId, invoiceId, sortBy, sortOrder, page, pageSize } =
    payoutsQuerySchema.parse(searchParams);

  const payouts = await prisma.payout.findMany({
    where: {
      programId,
      ...(status && { status }),
      ...(partnerId && { partnerId }),
      ...(invoiceId && { invoiceId }),
    },
    include: {
      partner: {
        include: {
          programs: {
            where: {
              programId,
            },
            select: {
              tenantId: true,
            },
          },
        },
      },
      user: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const transformedPayouts = payouts.map(({ partner, ...payout }) => ({
    ...payout,
    partner: {
      ...partner,
      ...partner.programs[0],
    },
  }));

  return NextResponse.json(
    z.array(PayoutResponseSchema).parse(transformedPayouts),
  );
});
