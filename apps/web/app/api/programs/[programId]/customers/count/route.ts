import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/customers/count
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const count = await prisma.customer.count({
    where: {
      sales: {
        some: {
          programId,
        },
      },
    },
  });

  return NextResponse.json(count);
});
