import { linkCache } from "@/lib/api/links/cache";
import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/workspaces/restore
export const POST = withAdmin(
  async ({ req }) => {
    const { slug } = await req.json();

    const project = await prisma.project.findUnique({
      where: {
        slug,
      },
    });

    if (!project) {
      return new Response("Workspace not found", { status: 404 });
    }

    while (true) {
      const linksToRestore = await prisma.link.findMany({
        where: {
          projectId: project.id,
          disabledAt: {
            not: null,
          },
        },
        take: 100,
      });
      if (linksToRestore.length === 0) {
        console.log("No more links to restore. Exiting...");
        break;
      }

      if (linksToRestore.length > 0) {
        const restoredLinks = await prisma.link.updateMany({
          where: {
            id: {
              in: linksToRestore.map((link) => link.id),
            },
          },
          data: {
            disabledAt: null,
          },
        });

        console.log(`Restored ${restoredLinks.count} links`);

        const res = await linkCache.expireMany(linksToRestore);
        console.log(res);
      }
    }

    const updatedOwners = await prisma.projectUsers.updateMany({
      where: {
        projectId: project.id,
        role: "billing",
      },
      data: {
        role: "owner",
      },
    });

    console.log(`Reverted ${updatedOwners.count} billing to owner role`);

    const updatedMembers = await prisma.projectUsers.updateMany({
      where: {
        projectId: project.id,
        role: "viewer",
      },
      data: {
        role: "member",
      },
    });

    console.log(`Reverted ${updatedMembers.count} viewers to member role`);

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
