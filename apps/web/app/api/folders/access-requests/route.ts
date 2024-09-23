import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/access-requests - get access requests made by the authenticated user
export const GET = withWorkspace(async ({ headers, session, workspace }) => {
  const folders = await prisma.folder.findMany({
    where: {
      projectId: workspace.id,
    },
    select: {
      id: true,
    },
  });

  const accessRequests = await prisma.folderAccessRequest.findMany({
    where: {
      userId: session.user.id,
      folderId: {
        in: folders.map((folder) => folder.id),
      },
    },
  });

  return NextResponse.json(accessRequests, {
    headers,
  });
});
