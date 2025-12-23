import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { dashboardSchema } from "@/lib/zod/schemas/dashboard";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /folders/[folderId]/dashboard – get dashboard for a given folder
export const GET = withWorkspace(
  async ({ params, workspace, session }) => {
    const { folderId } = params;

    const folder = await verifyFolderAccess({
      workspace,
      userId: session.user.id,
      folderId,
      requiredPermission: "folders.read",
    });

    const dashboard = await prisma.dashboard.findUnique({
      where: {
        folderId: folder.id,
      },
    });

    if (!dashboard) return NextResponse.json(null);

    return NextResponse.json(dashboardSchema.parse(dashboard));
  },
  {
    requiredPermissions: ["folders.read"],
  },
);
