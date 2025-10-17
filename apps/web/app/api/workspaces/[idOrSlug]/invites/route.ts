import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { inviteUser } from "@/lib/api/users";
import { withWorkspace } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import { inviteTeammatesSchema } from "@/lib/zod/schemas/invites";
import {
  getWorkspaceUsersQuerySchema,
  workspaceUserSchema,
} from "@/lib/zod/schemas/workspaces";
import { prisma } from "@dub/prisma";
import { PartnerRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/workspaces/[idOrSlug]/invites – get invites for a specific workspace
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { search, role } = getWorkspaceUsersQuerySchema.parse(searchParams);

    const invites = await prisma.projectInvite.findMany({
      where: {
        projectId: workspace.id,
        role,
        ...(search && {
          email: { contains: search },
        }),
      },
    });

    const parsedInvites = invites.map((invite) =>
      workspaceUserSchema.parse({
        ...invite,
        id: `${workspace.id}-${invite.email}`, // workspace ID + invite email for the dummy invite
        name: invite.email,
      }),
    );

    return NextResponse.json(parsedInvites);
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

    // Delete saved invites
    await redis.del(`invites:${workspace.id}`);

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

const updateInviteRoleSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(PartnerRole),
});

// PATCH /api/workspaces/[idOrSlug]/invites - update an invite's role
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const { email, role } = updateInviteRoleSchema.parse(await req.json());

    const invite = await prisma.projectInvite.findUnique({
      where: {
        email_projectId: {
          email,
          projectId: workspace.id,
        },
      },
    });

    if (!invite) {
      throw new DubApiError({
        code: "not_found",
        message: "The invitation you're trying to update was not found.",
      });
    }

    const response = await prisma.projectInvite.update({
      where: {
        email_projectId: {
          email,
          projectId: workspace.id,
        },
      },
      data: {
        role,
      },
    });

    return NextResponse.json(response);
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
