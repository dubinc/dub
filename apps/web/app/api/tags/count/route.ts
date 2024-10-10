import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTagsCountQuerySchema } from "@/lib/zod/schemas/tags";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/tags - get all tags for a workspace
export const GET = withWorkspace(
  async ({ req, workspace, headers }) => {
    const searchParams = getSearchParams(req.url);
    const { search } = getTagsCountQuerySchema.parse(searchParams);

    const count = await prisma.tag.count({
      where: {
        projectId: workspace.id,
        ...(search && {
          name: {
            contains: search,
          },
        }),
      },
    });

    return NextResponse.json(count, { headers });
  },
  {
    requiredPermissions: ["tags.read"],
  },
);
