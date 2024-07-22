import { exceededLimitError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
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
      expires: true,
      project: {
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
      },
    },
  });
  if (!invite) {
    return new Response("Invalid invite", { status: 404 });
  }

  if (invite.expires < new Date()) {
    return new Response("Invite expired", { status: 410 });
  }

  const workspace = invite.project;

  if (workspace._count.users >= workspace.usersLimit) {
    return new Response(
      exceededLimitError({
        plan: workspace.plan as PlanProps,
        limit: workspace.usersLimit,
        type: "users",
      }),
      {
        status: 403,
      },
    );
  }

  const response = await Promise.all([
    prisma.projectUsers.create({
      data: {
        userId: session.user.id,
        role: "member",
        projectId: workspace.id,
        notificationPreference: {
          create: {}, // by default, users are opted in to all notifications
        },
      },
    }),
    prisma.projectInvite.delete({
      where: {
        email_projectId: {
          email: session.user.email,
          projectId: workspace.id,
        },
      },
    }),
    session.user["defaultWorkspace"] === null &&
      prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          defaultWorkspace: workspace.slug,
        },
      }),
  ]);
  return NextResponse.json(response);
});
