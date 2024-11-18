import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  payoutsQuerySchema,
  payoutsResponseSchema,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/programs/[programId]/payouts - get all payouts for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { status, search, sortBy, order, page, pageSize } =
      payoutsQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const payouts = await prisma.payout.findMany({
      where: {
        programId,
        ...(status && { status }),
        ...(search && { partner: { name: { contains: search } } }),
      },
      include: {
        partner: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: order,
      },
    });

    return NextResponse.json(z.array(payoutsResponseSchema).parse(payouts));
  },
);
