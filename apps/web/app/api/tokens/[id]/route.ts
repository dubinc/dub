import { DubApiError } from "@/lib/api/errors";
import { getScopesByRole } from "@/lib/api/tokens/scopes";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tokenSchema, updateTokenSchema } from "@/lib/zod/schemas/token";
import { NextResponse } from "next/server";

// GET /api/tokens/:id - get info about a specific token
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const token = await prisma.restrictedToken.findUnique({
      where: {
        id: params.id,
        projectId: workspace.id,
      },
      select: {
        id: true,
        name: true,
        partialKey: true,
        scopes: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isMachine: true,
          },
        },
      },
    });

    if (!token) {
      throw new DubApiError({
        code: "not_found",
        message: `Token with id ${params.id} not found.`,
      });
    }

    return NextResponse.json(tokenSchema.parse(token));
  },
  {
    requiredPermissions: ["tokens.read"],
  },
);

// PATCH /api/tokens/:id - update a specific token
export const PATCH = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { name, scopes } = updateTokenSchema.parse(
      await parseRequestBody(req),
    );

    const { role } = await prisma.projectUsers.findUniqueOrThrow({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: workspace.id,
        },
      },
      select: {
        role: true,
      },
    });

    // Check given scopes are valid based on user's role
    const userScopes = getScopesByRole(role);

    if (
      scopes?.length &&
      scopes.every((scope) => !userScopes.includes(scope))
    ) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Some of the given scopes are not available for your role.",
      });
    }

    const token = await prisma.restrictedToken.update({
      where: {
        id: params.id,
        projectId: workspace.id,
      },
      data: {
        ...(name && { name }),
        ...(scopes && { scopes: [...new Set(scopes)].join(" ") }),
      },
      select: {
        id: true,
        name: true,
        partialKey: true,
        scopes: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isMachine: true,
          },
        },
      },
    });

    return NextResponse.json(tokenSchema.parse(token));
  },
  {
    requiredPermissions: ["tokens.write"],
  },
);

// DELETE /api/tokens/:id - delete a specific token
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const token = await prisma.restrictedToken.delete({
      where: {
        id: params.id,
        projectId: workspace.id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            isMachine: true,
          },
        },
      },
    });

    if (token.user.isMachine) {
      await prisma.user.delete({
        where: {
          id: token.user.id,
        },
      });
    }

    return NextResponse.json({
      id: token.id,
    });
  },
  {
    requiredPermissions: ["tokens.write"],
  },
);
