import { disableWorkspaceLinks } from "@/lib/api/workspaces/disable-workspace-links";
import { withAdmin } from "@/lib/auth";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/workspaces/disable
export const POST = withAdmin(
  async ({ req }) => {
    const { slug } = await req.json();

    const project = await prisma.project.findUnique({
      where: {
        slug,
      },
      include: {
        users: {
          where: {
            role: "owner",
            user: {
              email: {
                not: null,
              },
            },
          },
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return new Response("Workspace not found", { status: 404 });
    }

    await disableWorkspaceLinks(project.id);

    const updatedOwners = await prisma.projectUsers.updateMany({
      where: {
        projectId: project.id,
        role: "owner",
      },
      data: {
        role: "billing",
      },
    });

    console.log(`Updated ${updatedOwners.count} owners to billing role`);

    const updatedMembers = await prisma.projectUsers.updateMany({
      where: {
        projectId: project.id,
        role: "member",
      },
      data: {
        role: "viewer",
      },
    });

    console.log(`Updated ${updatedMembers.count} members to viewer role`);

    const owners = project.users.map(({ user }) => user.email);

    if (owners.length > 0) {
      await queueBatchEmail(
        owners.map((email) => ({
          to: email!,
          variant: "notifications",
          subject: "Your Dub workspace has been disabled",
          templateName: "WorkspaceDisabled",
          templateProps: {
            email: email!,
            workspace: {
              name: project.name,
              slug: project.slug,
              usage: project.usage,
              usageLimit: project.usageLimit,
              plan: project.plan,
            },
          },
        })),
      );
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
