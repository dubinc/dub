import { DubApiError } from "@/lib/api/errors";
import { assertRoleAllowedForPlan } from "@/lib/api/workspaces/assert-role-plan";
import { onboardingStepCache } from "@/lib/api/workspaces/onboarding-step-cache";
import { withSession } from "@/lib/auth";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import { prisma } from "@/lib/prisma";
import { PlanProps } from "@/lib/types";
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
    select: {
      projectId: true,
      expires: true,
      role: true,
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

  const [workspaceUser, workspace] = await Promise.all([
    prisma.projectUsers.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: invite.projectId,
        },
      },
      select: {
        id: true,
      },
    }),

    prisma.project.findUniqueOrThrow({
      where: {
        id: invite.projectId,
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        planPeriod: true,
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
    }),
  ]);

  if (workspaceUser) {
    throw new DubApiError({
      code: "conflict",
      message: "You are already a member of this workspace.",
    });
  }

  assertRoleAllowedForPlan({
    role: invite.role,
    plan: workspace.plan,
  });

  if (workspace._count.users >= workspace.usersLimit) {
    throw new DubApiError({
      code: "exceeded_limit",
      message: exceededLimitError({
        plan: workspace.plan as PlanProps,
        planPeriod: workspace.planPeriod,
        limit: workspace.usersLimit,
        type: "users",
      }),
    });
  }

  await prisma.$transaction(async (tx) => {
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

    await tx.projectInvite.delete({
      where: {
        email_projectId: {
          email: session.user.email,
          projectId: workspace.id,
        },
      },
    });

    const userCount = await tx.projectUsers.count({
      where: {
        projectId: workspace.id,
        user: {
          isMachine: false,
        },
      },
    });

    if (userCount > workspace.usersLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan as PlanProps,
          planPeriod: workspace.planPeriod,
          limit: workspace.usersLimit,
          type: "users",
        }),
      });
    }
  });

  // Update default workspace
  if (!session.user.defaultWorkspace) {
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        defaultWorkspace: workspace.slug,
      },
    });
  }

  await onboardingStepCache.set({
    userId: session.user.id,
    step: "completed",
  });

  return NextResponse.json({ message: "Invite accepted." });
});
