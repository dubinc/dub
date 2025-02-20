import { withWorkspace } from "@/lib/auth";
import { getTagsCountQuerySchema } from "@/lib/zod/schemas/tags";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/tags/count - get count of tags
export const GET = withWorkspace(
  async ({ workspace, headers, searchParams }) => {
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
