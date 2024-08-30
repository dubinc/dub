import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { inviteUser } from "@/lib/api/users";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roles } from "@/lib/types";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const inviteTeammatesSchema = z.object({
  teammates: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(roles),
    }),
  ),
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
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json(invites);
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);

// POST /api/workspaces/[idOrSlug]/invites – invite a teammate
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { teammates } = inviteTeammatesSchema.parse(await req.json());

    if (teammates.length > 10) {
      throw new DubApiError({
        code: "bad_request",
        message: "You can only invite up to 10 teammates at a time.",
      });
    }

    const [alreadyInWorkspace, workspaceUserCount, workspaceInviteCount] =
      await Promise.all([
        prisma.projectUsers.findFirst({
          where: {
            projectId: workspace.id,
            user: {
              email: {
                in: teammates.map(({ email }) => email),
              },
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

    if (
      workspaceUserCount + workspaceInviteCount + teammates.length >
      workspace.usersLimit
    ) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan,
          limit: workspace.usersLimit,
          type: "users",
        }),
      });
    }

    // We could update inviteUser to accept multiple emails but it's not trivial
    const results = await Promise.allSettled(
      teammates.map(({ email, role }) =>
        inviteUser({
          email,
          role,
          workspace,
          session,
        }),
      ),
    );

    if (results.some((result) => result.status === "rejected")) {
      throw new DubApiError({
        code: "bad_request",
        message:
          teammates.length > 1
            ? "Some invitations could not be sent."
            : "Invitation could not be sent.",
      });
    }

    return NextResponse.json({ message: "Invite(s) sent" });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);

// DELETE /api/workspaces/[idOrSlug]/invites – delete a pending invite
export const DELETE = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { email } = z
      .object({
        email: z.string().email(),
      })
      .parse(searchParams);
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
    requiredPermissions: ["workspaces.write"],
  },
);
