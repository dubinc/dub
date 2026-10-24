import { DubApiError } from "@/lib/api/errors";
import { activeRestrictedTokenWhere } from "@/lib/api/tokens/active-restricted-token";
import { validateScopesForRole } from "@/lib/api/tokens/scopes";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { tokenCache } from "@/lib/auth/token-cache";
import { prisma } from "@/lib/prisma";
import { tokenSchema, updateTokenSchema } from "@/lib/zod/schemas/token";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/tokens/:id - get info about a specific token
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const token = await prisma.restrictedToken.findFirst({
      where: {
        id: params.id,
        projectId: workspace.id,
        installationId: null,
        ...activeRestrictedTokenWhere(),
      },
      select: {
        id: true,
        name: true,
        partialKey: true,
        scopes: true,
        expires: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true,
        user: true,
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

    if (!validateScopesForRole(scopes, role)) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Some of the given scopes are not available for your role.",
      });
    }

    try {
      const token = await prisma.restrictedToken.update({
        where: {
          id: params.id,
          projectId: workspace.id,
          installationId: null,
          ...activeRestrictedTokenWhere(),
        },
        data: {
          ...(name && { name }),
          ...(scopes && { scopes: [...new Set(scopes)].join(" ") }),
        },
        include: {
          user: true,
        },
      });

      // update tokens cache
      waitUntil(
        tokenCache.set({
          hashedKey: token.hashedKey,
          token,
        }),
      );

      return NextResponse.json(tokenSchema.parse(token));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new DubApiError({
          code: "not_found",
          message: `Token with id ${params.id} not found.`,
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["tokens.write"],
  },
);

// DELETE /api/tokens/:id - delete a specific token
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const token = await prisma.restrictedToken.findFirst({
      where: {
        id: params.id,
        projectId: workspace.id,
        installationId: null,
        ...activeRestrictedTokenWhere(),
      },
      select: {
        id: true,
        hashedKey: true,
        user: {
          select: {
            id: true,
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

    const now = new Date();

    if (token.user.isMachine) {
      await prisma.$transaction([
        prisma.restrictedToken.update({
          where: {
            id: token.id,
          },
          data: {
            expires: now,
          },
        }),

        prisma.projectUsers.delete({
          where: {
            userId_projectId: {
              userId: token.user.id,
              projectId: workspace.id,
            },
          },
        }),
      ]);
    } else {
      await prisma.restrictedToken.update({
        where: {
          id: token.id,
        },
        data: {
          expires: now,
        },
      });
    }

    // delete tokens cache
    waitUntil(
      tokenCache.delete({
        hashedKey: token.hashedKey,
      }),
    );

    return NextResponse.json({
      id: token.id,
    });
  },
  {
    requiredPermissions: ["tokens.write"],
  },
);
