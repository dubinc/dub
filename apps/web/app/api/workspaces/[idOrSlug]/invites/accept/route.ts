import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { PlanProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/invites/accept – accept a workspace invite
export const POST = withSession(async ({ session, params }) => {
  const { idOrSlug: slug } = params;

  const invite = await prisma.projectInvite.findFirst({
    where: {
      email: session.user.email,
      project: {
        slug,
      },
    },
  });

  if (!invite) {
    throw new DubApiError({
      code: "not_found",
      message: "This invite is not found.",
    });
  }

  if (invite.expires < new Date()) {
    throw new DubApiError({
      code: "invite_expired",
      message: "This invite has expired.",
    });
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const existingMembership = await tx.projectUsers.findFirst({
      where: {
        userId: session.user.id,
        projectId: invite.projectId,
      },
    });

    if (existingMembership) {
      throw new DubApiError({
        code: "conflict",
        message: "You are already a member of this workspace.",
      });
    }

    const workspace = await tx.project.findUniqueOrThrow({
      where: {
        id: invite.projectId,
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        usersLimit: true,
        _count: {
          select: {
            users: {
              where: {
                user: {
                  isMachine: false,
                },
              },
            },
          },
        },
      },
    });

    if (workspace._count.users >= workspace.usersLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan as PlanProps,
          limit: workspace.usersLimit,
          type: "users",
        }),
      });
    }

    await tx.projectUsers.create({
      data: {
        userId: session.user.id,
        role: invite.role,
        projectId: workspace.id,
        notificationPreference: {
          create: {}, // by default, users are opted in to all notifications
        },
      },
    });

    // Delete invite inside transaction to ensure consistency
    await tx.projectInvite.delete({
      where: {
        email_projectId: {
          email: session.user.email,
          projectId: workspace.id,
        },
      },
    });

    return workspace;
  });

  // Update default workspace
  if (session.user["defaultWorkspace"] === null) {
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        defaultWorkspace: workspace.slug,
      },
    });
  }

  return NextResponse.json({ message: "Invite accepted." });
});
