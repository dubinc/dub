import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/domains/count – get the number of domains for a workspace
export const GET = async (req: Request) => {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  const domains = await prisma.domain.findMany({
    where: {
      projectId: workspaceId ?? undefined,
    },
  });

  return NextResponse.json(domains);
};
