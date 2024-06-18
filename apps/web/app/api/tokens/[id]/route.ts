import { DubApiError } from "@/lib/api/errors";
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
    requiredScopes: ["tokens.read"],
  },
);

// PATCH /api/tokens/:id - update a specific token
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { scopes } = updateTokenSchema.parse(await parseRequestBody(req));

    const token = await prisma.restrictedToken.update({
      where: {
        id: params.id,
        projectId: workspace.id,
      },
      data: {
        scopes: scopes.join(" "),
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
    requiredScopes: ["tokens.write"],
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

    // If the user is a service account, delete the user as well
    // It is one-to-one relationship between service account and token
    if (token.user.isMachine) {
      await prisma.user.delete({
        where: {
          id: token.user.id,
        },
      });
    }

    // TODO:
    // Send email to user that their token has been deleted

    return NextResponse.json({
      id: token.id,
    });
  },
  {
    requiredScopes: ["tokens.write"],
  },
);
