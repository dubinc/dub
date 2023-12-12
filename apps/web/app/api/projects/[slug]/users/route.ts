import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const { userId, role } = await req.json();
    if (!userId || !role) {
      return new Response("Missing userId or role", { status: 400 });
    }
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
  async ({ searchParams, project }) => {
    const { userId } = searchParams;
    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }
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
    if (projectUser?.role === "owner") {
      return new Response(
        "Cannot remove owner from project. Please transfer ownership to another user first.",
        { status: 400 },
      );
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
