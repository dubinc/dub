import { DubApiError } from "@/lib/api/errors";
import { throwIfNoAccess } from "@/lib/api/tokens/permissions";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import {
  getWorkspaceUsersQuerySchema,
  workspaceUserSchema,
} from "@/lib/zod/schemas/workspaces";
import { prisma } from "@dub/prisma";
import { WorkspaceRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  },
);

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(WorkspaceRole, {
    errorMap: () => ({
      message: `Role must be either "owner" or "member".`,
    }),
  }),
});

// PATCH /api/workspaces/[idOrSlug]/users – update a user's role for a specific workspace
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const { userId, role } = updateRoleSchema.parse(await req.json());
    const response = await prisma.projectUsers.update({
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
    return NextResponse.json(response);
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
              isMachine: true,
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
        message: "User not found",
      });
    }

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

    const [response] = await Promise.allSettled([
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
      prisma.restrictedToken.deleteMany({
        where: {
          projectId: workspace.id,
          userId,
        },
      }),
    ]);

    // delete the user if it's a machine user
    if (projectUser.user.isMachine) {
      await prisma.user.delete({
        where: {
          id: userId,
        },
      });
    }

    return NextResponse.json(response);
  },
  {
    skipPermissionChecks: true,
  },
);
