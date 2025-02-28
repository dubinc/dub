import { withWorkspace } from "@/lib/auth";
import { listFoldersQuerySchema } from "@/lib/zod/schemas/folders";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/count - get count of folders
export const GET = withWorkspace(
  async ({ workspace, headers, session, searchParams }) => {
    const { search } = listFoldersQuerySchema
      .omit({ page: true, pageSize: true })
      .parse(searchParams);

    const count = await prisma.folder.count({
      where: {
        projectId: workspace.id,
        OR: [
          { accessLevel: { not: null } },
          {
            users: {
              some: {
                userId: session.user.id,
                role: { not: null },
              },
            },
          },
        ],
        users: {
          none: {
            userId: session.user.id,
            role: null,
          },
        },
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
    requiredPermissions: ["folders.read"],
    featureFlag: "linkFolders",
  },
);
