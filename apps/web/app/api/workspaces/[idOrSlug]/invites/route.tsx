import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { inviteUser } from "@/lib/api/users";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const emailInviteSchema = z.object({
  email: z.string().email(),
});

// GET /api/workspaces/[idOrSlug]/invites – get invites for a specific workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const invites = await prisma.projectInvite.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        email: true,
        createdAt: true,
      },
    });
    return NextResponse.json(invites);
  },
  {
    requiredScopes: ["workspaces.read"],
  },
);

// POST /api/workspaces/[idOrSlug]/invites – invite a teammate
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { email } = emailInviteSchema.parse(await req.json());

    const [alreadyInWorkspace, workspaceUserCount, workspaceInviteCount] =
      await Promise.all([
        prisma.projectUsers.findFirst({
          where: {
            projectId: workspace.id,
            user: {
              email,
            },
          },
        }),
        prisma.projectUsers.count({
          where: {
            projectId: workspace.id,
            user: {
              isMachine: false,
            },
          },
        }),
        prisma.projectInvite.count({
          where: {
            projectId: workspace.id,
          },
        }),
      ]);

    if (alreadyInWorkspace) {
      throw new DubApiError({
        code: "bad_request",
        message: "User already exists in this workspace.",
      });
    }

    if (workspaceUserCount + workspaceInviteCount >= workspace.usersLimit) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan,
          limit: workspace.usersLimit,
          type: "users",
        }),
      });
    }

    await inviteUser({
      email,
      workspace,
      session,
    });

    return NextResponse.json({ message: "Invite sent" });
  },
  {
    requiredScopes: ["workspaces.write"],
  },
);

// DELETE /api/workspaces/[idOrSlug]/invites – delete a pending invite
export const DELETE = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { email } = emailInviteSchema.parse(searchParams);
    const response = await prisma.projectInvite.delete({
      where: {
        email_projectId: {
          email,
          projectId: workspace.id,
        },
      },
    });
    return NextResponse.json(response);
  },
  {
    requiredScopes: ["workspaces.write"],
  },
);
