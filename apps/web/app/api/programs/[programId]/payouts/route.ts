import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import z from "zod";

// GET /api/programs/[programId]/payouts - get all payouts for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId: params.programId,
  });

  const payouts = await prisma.payout.findMany({
    where: {
      programId: program.id,
    },
  });

  return NextResponse.json(z.array(PayoutSchema).parse(payouts));
});
