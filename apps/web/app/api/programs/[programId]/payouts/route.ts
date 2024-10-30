import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutSchema } from "@/lib/zod/schemas/partners";
import { PayoutStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

const searchSchema = z.object({
  status: z.nativeEnum(PayoutStatus).optional(),
  offset: z.number().optional().default(0),
  limit: z.number().optional().default(50),
});

// GET /api/programs/[programId]/payouts - get all payouts for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { status, offset, limit } = searchSchema.parse(searchParams);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: params.programId,
    });

    const payouts = await prisma.payout.findMany({
      where: {
        programId: program.id,
        ...(status && { status }),
      },
      skip: offset,
      take: limit,
    });

    return NextResponse.json(z.array(PayoutSchema).parse(payouts));
  },
);
