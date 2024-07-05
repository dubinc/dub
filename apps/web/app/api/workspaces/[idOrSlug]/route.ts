import { DubApiError } from "@/lib/api/errors";
import { deleteWorkspace } from "@/lib/api/workspaces";
import { withWorkspace } from "@/lib/auth";
import { isBetaTester } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import {
  WorkspaceSchema,
  updateWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug] – get a specific workspace by id or slug
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const betaTester = await isBetaTester(workspace.id);
    const domains = await prisma.domain.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        slug: true,
        primary: true,
      },
    });

    return NextResponse.json(
      WorkspaceSchema.parse({
        ...workspace,
        id: `ws_${workspace.id}`,
        domains,
        betaTester,
      }),
      { headers },
    );
  },
  {
    requiredScopes: ["workspaces.read"],
  },
);

// PATCH /api/workspaces/[idOrSlug] – update a specific workspace by id or slug
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    try {
      const { name, slug } = await updateWorkspaceSchema.parseAsync(
        await req.json(),
      );

      const response = await prisma.project.update({
        where: {
          slug: workspace.slug,
        },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
        },
        include: {
          domains: true,
          users: true,
        },
      });

      if (slug !== workspace.slug) {
        await prisma.user.updateMany({
          where: {
            defaultWorkspace: workspace.slug,
          },
          data: {
            defaultWorkspace: slug,
          },
        });
      }

      const betaTester = await isBetaTester(workspace.id);

      return NextResponse.json(
        WorkspaceSchema.parse({
          ...response,
          id: `ws_${response.id}`,
          betaTester,
        }),
      );
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "Workspace slug already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredScopes: ["workspaces.write"],
  },
);

export const PUT = PATCH;

// DELETE /api/workspaces/[idOrSlug] – delete a specific project
export const DELETE = withWorkspace(
  async ({ workspace }) => {
    await deleteWorkspace(workspace);

    return NextResponse.json(workspace);
  },
  {
    requiredScopes: ["workspaces.write"],
  },
);
