import { DubApiError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth/utils";
import prisma from "@/lib/prisma";
import { roles } from "@/lib/types";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(roles, {
    errorMap: () => ({
      message: `Role must be either "owner" or "member".`,
    }),
  }),
});

const removeUserSchema = z.object({
  userId: z.string().min(1),
});

// GET /api/projects/[slug]/users – get users for a specific project
export const GET = withAuth(async ({ project }) => {
  const users = await prisma.projectUsers.findMany({
    where: {
      projectId: project.id,
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      createdAt: true,
    },
  });
  return NextResponse.json(
    users.map((u) => ({
      ...u.user,
      role: u.role,
    })),
  );
});

// PUT /api/projects/[slug]/users – update a user's role for a specific project
export const PUT = withAuth(
  async ({ req, project }) => {
    const { userId, role } = updateRoleSchema.parse(await req.json());
    const response = await prisma.projectUsers.update({
      where: {
        userId_projectId: {
          projectId: project.id,
          userId,
        },
      },
      data: {
        role,
      },
    });
    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/projects/[slug]/users – remove a user from a project

export const DELETE = withAuth(
  async ({ searchParams, project, session }) => {
    const { userId } = removeUserSchema.parse(searchParams);
    const projectUser = await prisma.projectUsers.findUnique({
      where: {
        userId_projectId: {
          projectId: project.id,
          userId,
        },
      },
      select: {
        role: true,
      },
    });
    if (!projectUser) {
      throw new DubApiError({
        code: "not_found",
        message: "User not found",
      });
    }
    if (projectUser.role === "owner" && userId === session.user.id) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Cannot remove owner from project. Please transfer ownership to another user first.",
      });
    }
    const response = await prisma.projectUsers.delete({
      where: {
        userId_projectId: {
          projectId: project.id,
          userId,
        },
      },
    });
    return NextResponse.json(response);
  },
  {
    requiredRole: ["owner"],
    allowSelf: true,
  },
);
