import { DubApiError } from "@/lib/api/errors";
import { activeRestrictedTokenWhere } from "@/lib/api/tokens/active-restricted-token";
import { throwIfNoAccess } from "@/lib/api/tokens/throw-if-no-access";
import { assertRoleAllowedForPlan } from "@/lib/api/workspaces/assert-role-plan";
import { withWorkspace } from "@/lib/auth";
import { tokenCache } from "@/lib/auth/token-cache";
import { syncStagingWorkspaceJob } from "@/lib/jobs/handlers/sync-staging-workspace-job";
import { generateRandomName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import { assertNotStagingWorkspace } from "@/lib/sandbox/workspace-guards";
import {
  getWorkspaceUsersQuerySchema,
  workspaceUserSchema,
} from "@/lib/zod/schemas/workspaces";
import { pluck, pluralize } from "@dub/utils";
import { WorkspaceRole } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/workspaces/[idOrSlug]/users – get users for a specific workspace
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { search, role } = getWorkspaceUsersQuerySchema.parse(searchParams);

    const users = await prisma.projectUsers.findMany({
      where: {
        projectId: workspace.id,
        role,
        ...(search && {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          },
        }),
      },
      include: {
        user: true,
      },
    });

    const parsedUsers = users.map(({ user, ...rest }) =>
      workspaceUserSchema.parse({
        ...rest,
        ...user,
        name: user.name || user.email || generateRandomName(),
        createdAt: rest.createdAt, // preserve the createdAt field from ProjectUsers
      }),
    );

    return NextResponse.json(parsedUsers);
  },
  {
    requiredPermissions: ["workspaces.read"],
    requiredRoles: ["owner", "member", "billing"],
  },
);

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(WorkspaceRole),
});

// PATCH /api/workspaces/[idOrSlug]/users – update a user's role for a specific workspace
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    assertNotStagingWorkspace(workspace);

    const { userId, role } = updateRoleSchema.parse(await req.json());

    assertRoleAllowedForPlan({
      role,
      plan: workspace.plan,
    });

    const workspaceUser = await prisma.projectUsers.update({
      where: {
        userId_projectId: {
          projectId: workspace.id,
          userId,
        },
        user: {
          isMachine: false,
        },
      },
      data: {
        role,
      },
    });

    await syncStagingWorkspaceJob.dispatch({
      action: "update-member-role",
      workspaceId: workspace.id,
      userId: workspaceUser.userId,
    });

    return NextResponse.json(workspaceUser);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);

const removeUserSchema = z.object({
  userId: z.string().min(1),
});

// DELETE /api/workspaces/[idOrSlug]/users – remove a user from a workspace or leave a workspace
export const DELETE = withWorkspace(
  async ({ searchParams, workspace, session, permissions }) => {
    const { userId } = removeUserSchema.parse(searchParams);

    if (userId !== session.user.id) {
      throwIfNoAccess({
        permissions,
        requiredPermissions: ["workspaces.write"],
        workspaceId: workspace.id,
      });
    }

    const [projectUser, totalOwners] = await Promise.all([
      prisma.projectUsers.findUnique({
        where: {
          userId_projectId: {
            projectId: workspace.id,
            userId,
          },
        },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              isMachine: true,
              defaultWorkspace: true,
            },
          },
        },
      }),

      prisma.projectUsers.count({
        where: {
          projectId: workspace.id,
          role: "owner",
        },
      }),
    ]);

    if (!projectUser) {
      throw new DubApiError({
        code: "not_found",
        message: "User not found.",
      });
    }

    assertNotStagingWorkspace(workspace, {
      when: !projectUser.user.isMachine,
    });

    // If there is only one owner and the user is an owner and the user is trying to remove themselves
    if (
      totalOwners === 1 &&
      projectUser.role === "owner" &&
      userId === session.user.id
    ) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Cannot remove owner from workspace. Please transfer ownership to another user first.",
      });
    }

    const now = new Date();

    const [workspaceKeys, installations] = await Promise.all([
      prisma.restrictedToken.findMany({
        where: {
          projectId: workspace.id,
          userId,
          installationId: null,
          ...activeRestrictedTokenWhere(now),
        },
        select: {
          id: true,
          hashedKey: true,
          lastUsed: true,
        },
      }),

      prisma.installedIntegration.findMany({
        where: {
          projectId: workspace.id,
          userId,
        },
        select: {
          id: true,
          accessTokens: {
            select: {
              hashedKey: true,
            },
          },
        },
      }),
    ]);

    const activeWorkspaceKeys = workspaceKeys.filter((token) => token.lastUsed);

    if (activeWorkspaceKeys.length > 0) {
      const tokenTense = pluralize("token", activeWorkspaceKeys.length);
      throw new DubApiError({
        code: "bad_request",
        message: `This user has ${activeWorkspaceKeys.length} active restricted ${tokenTense}. Please remove the ${tokenTense} first before removing the user from the workspace.`,
      });
    }

    await prisma.$transaction([
      // Remove the user from the workspace
      prisma.projectUsers.delete({
        where: {
          userId_projectId: {
            projectId: workspace.id,
            userId,
          },
        },
      }),

      // Remove tokens associated with the user from the workspace
      ...(workspaceKeys.length > 0
        ? [
            prisma.restrictedToken.updateMany({
              where: {
                id: {
                  in: pluck(workspaceKeys, "id"),
                },
                expires: null,
              },
              data: {
                expires: now,
              },
            }),
          ]
        : []),

      // Remove installations associated with the user from the workspace.
      // delete() instead of deleteMany: relationMode is "prisma", so onDelete
      // cascades (access tokens, refresh tokens, webhooks) run per delete only.
      ...installations.map((installation) =>
        prisma.installedIntegration.delete({
          where: {
            id: installation.id,
          },
        }),
      ),

      prisma.oAuthCode.deleteMany({
        where: {
          projectId: workspace.id,
          userId,
        },
      }),

      // Remove the default workspace for the user if they are leaving the workspace
      ...(workspace.slug === projectUser.user.defaultWorkspace
        ? [
            prisma.user.update({
              where: {
                id: userId,
              },
              data: {
                defaultWorkspace: null,
              },
            }),
          ]
        : []),

      // Remove the user if it's a machine user
      ...(projectUser.user.isMachine
        ? [
            prisma.user.delete({
              where: {
                id: userId,
              },
            }),
          ]
        : []),
    ]);

    const hashedKeys = [
      ...pluck(workspaceKeys, "hashedKey"),
      ...installations.flatMap((installation) =>
        pluck(installation.accessTokens, "hashedKey"),
      ),
    ];

    if (hashedKeys.length > 0) {
      waitUntil(
        tokenCache.expireMany({
          hashedKeys,
        }),
      );
    }

    if (!projectUser.user.isMachine) {
      await syncStagingWorkspaceJob.dispatch({
        action: "remove-member",
        workspaceId: workspace.id,
        userId,
      });
    }

    return NextResponse.json({
      userId,
    });
  },
);
