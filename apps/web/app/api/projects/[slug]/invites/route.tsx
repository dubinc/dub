import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { inviteUser } from "@/lib/api/users";
import prisma from "@/lib/prisma";

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
    const { email } = await req.json();
    const alreadyInTeam = await prisma.projectUsers.findFirst({
      where: {
        projectId: project.id,
        user: {
          email,
        },
      },
    });
    if (alreadyInTeam) {
      return new Response("User already exists in this project.", {
        status: 400,
      });
    }

    if (project.plan === "free") {
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
      if (users + invites >= 3) {
        return new Response(
          "You've reached the maximum number of users for the free plan.",
          {
            status: 400,
          },
        );
      }
    }

    try {
      await inviteUser({
        email,
        project,
        session,
      });
      return NextResponse.json({ message: "Invite sent" });
    } catch (error) {
      return new Response(error.message, {
        status: 400,
      });
    }
  },
  {
    requiredRole: ["owner"],
  },
);

// DELETE /api/projects/[slug]/invites – delete a pending invite
export const DELETE = withAuth(
  async ({ searchParams, project }) => {
    const { email } = searchParams;
    if (!email) {
      return new Response("Missing email", {
        status: 400,
      });
    }
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
