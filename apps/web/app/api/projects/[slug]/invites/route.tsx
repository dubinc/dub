import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { inviteUser } from "@/lib/api/users";
import prisma from "@/lib/prisma";
import { exceededLimitError } from "@/lib/api/errors";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import z from "@/lib/zod";

const createOrDeleteInviteSchema = z.object({
  email: z.string().email(),
});

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

// POST /api/projects/[slug]/invites – invite a teammate
export const POST = withAuth(
  async ({ req, project, session }) => {
    try {
      const { email } = createOrDeleteInviteSchema.parse(await req.json());
      const alreadyInTeam = await prisma.projectUsers.findFirst({
        where: {
          projectId: project.id,
          user: {
            email,
          },
        },
      });
      if (alreadyInTeam) {
        throw new DubApiError({
          code: "bad_request",
          message: "User already exists in this project.",
        });
      }

      const users = await prisma.projectUsers.count({
        where: {
          projectId: project.id,
        },
      });
      const invites = await prisma.projectInvite.count({
        where: {
          projectId: project.id,
        },
      });
      if (users + invites >= project.usersLimit) {
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
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/projects/[slug]/invites – delete a pending invite
export const DELETE = withAuth(
  async ({ searchParams, project }) => {
    try {
      const { email } = createOrDeleteInviteSchema.parse(searchParams);
      const response = await prisma.projectInvite.delete({
        where: {
          email_projectId: {
            email,
            projectId: project.id,
          },
        },
      });
      return NextResponse.json(response);
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    requiredRole: ["owner"],
  },
);
