import { withWorkspace } from "@/lib/auth";
import { getDomainsCountQuerySchema } from "@/lib/zod/schemas/domains";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/domains/count – get the number of domains for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace }) => {
    const { archived, search } = getDomainsCountQuerySchema.parse(searchParams);

    const count = await prisma.domain.count({
      where: {
        projectId: workspace.id,
        archived,
        ...(search && { slug: { contains: search } }),
      },
    });

    return NextResponse.json(count, {
      headers,
    });
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
