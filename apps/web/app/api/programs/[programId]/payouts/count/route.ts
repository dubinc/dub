import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

export const responseSchema = z.object({
  status: z.nativeEnum(PayoutStatus),
  _count: z.number(),
});

// GET /api/programs/[programId]/payouts/count
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const payouts = await prisma.payout.groupBy({
    by: ["status"],
    where: {
      programId,
    },
    _count: true,
  });

  const allStatuses = Object.values(PayoutStatus).map((status) => ({
    status,
    _count: 0,
  }));

  // Fill the missing statuses with 0
  const counts = allStatuses.map(
    (statusCount) =>
      payouts.find((p) => p.status === statusCount.status) || statusCount,
  );

  return NextResponse.json(z.array(responseSchema).parse(counts));
});
