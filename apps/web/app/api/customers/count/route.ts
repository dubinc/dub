import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/customers/count
export const GET = withWorkspace(async ({ workspace, params }) => {
  const count = await prisma.customer.count({
    where: {
      projectId: workspace.id,
    },
  });

  return NextResponse.json(count);
});
