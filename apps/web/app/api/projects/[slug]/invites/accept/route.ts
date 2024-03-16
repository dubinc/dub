import { exceededLimitError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth/utils";
import prisma from "@/lib/prisma";
import { PlanProps } from "@/lib/types";
import { NextResponse } from "next/server";

// POST /api/projects/[slug]/invites/accept – accept a project invite
export const POST = withSession(async ({ session, params }) => {
  const invite = await prisma.projectInvite.findFirst({
    where: {
      email: session.user.email,
      project: {
        slug: params.slug,
      },
    },
    select: {
      expires: true,
      project: {
        select: {
          id: true,
          plan: true,
          usersLimit: true,
          _count: {
            select: {
              users: true,
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

  const project = invite.project;

  if (project._count.users >= project.usersLimit) {
    return new Response(
      exceededLimitError({
        plan: project.plan as PlanProps,
        limit: project.usersLimit,
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
        projectId: project.id,
      },
    }),
    prisma.projectInvite.delete({
      where: {
        email_projectId: {
          email: session.user.email,
          projectId: project.id,
        },
      },
    }),
  ]);
  return NextResponse.json(response);
});
