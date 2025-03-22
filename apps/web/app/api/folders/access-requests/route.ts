import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/folders/access-requests - get access requests made by the authenticated user
export const GET = withWorkspace(
  async ({ headers, session, workspace }) => {
    const accessRequests = await prisma.folderAccessRequest.findMany({
      where: {
        userId: session.user.id,
        folder: {
          projectId: workspace.id,
        },
      },
    });

    return NextResponse.json(accessRequests, {
      headers,
    });
  },
  {
    requiredPermissions: ["folders.read"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
    featureFlag: "linkFolders",
  },
);
