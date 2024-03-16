import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { inviteUser } from "@/lib/api/users";
import { withAuth } from "@/lib/auth/utils";
import prisma from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/invites – get invites for a specific project
export const GET = withAuth(async ({ project }) => {
  const invites = await prisma.projectInvite.findMany({
    where: {
      projectId: project.id,
    },
    select: {
      email: true,
      createdAt: true,
    },
  });
  return NextResponse.json(invites);
});

const emailInviteSchema = z.object({
  email: z.string().email(),
});

// POST /api/projects/[slug]/invites – invite a teammate
export const POST = withAuth(
  async ({ req, project, session }) => {
    const { email } = emailInviteSchema.parse(await req.json());

    const [alreadyInTeam, projectUserCount, projectInviteCount] =
      await Promise.all([
        prisma.projectUsers.findFirst({
          where: {
            projectId: project.id,
            user: {
              email,
            },
          },
        }),
        prisma.projectUsers.count({
          where: {
            projectId: project.id,
          },
        }),
        prisma.projectInvite.count({
          where: {
            projectId: project.id,
          },
        }),
      ]);

    if (alreadyInTeam) {
      throw new DubApiError({
        code: "bad_request",
        message: "User already exists in this project.",
      });
    }

    if (projectUserCount + projectInviteCount >= project.usersLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: project.plan,
          limit: project.usersLimit,
          type: "users",
        }),
      });
    }

    await inviteUser({
      email,
      project,
      session,
    });

    return NextResponse.json({ message: "Invite sent" });
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/projects/[slug]/invites – delete a pending invite
export const DELETE = withAuth(
  async ({ searchParams, project }) => {
    const { email } = emailInviteSchema.parse(searchParams);
    const response = await prisma.projectInvite.delete({
      where: {
        email_projectId: {
          email,
          projectId: project.id,
        },
      },
    });
    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
  },
);
