import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/folders/[folderId]/users – delete users from a folder
export const DELETE = withWorkspace(
  async ({ params, workspace, searchParams }) => {
    const { folderId } = params;

    const userIds = searchParams["userIds"]
      ? searchParams["userIds"].split(",")
      : [];

    if (userIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Please provide comma separated userIds to delete. For example, `?userIds=x,x,x`",
      });
    }

    await prisma.folder.findUniqueOrThrow({
      where: {
        id: folderId,
        projectId: workspace.id,
      },
    });

    const { count: deletedCount } = await prisma.folderUser.deleteMany({
      where: {
        folderId,
        userId: {
          in: userIds,
        },
      },
    });

    return NextResponse.json({
      deletedCount,
    });
  },
  {
    requiredPermissions: ["folders.write"],
  },
);
