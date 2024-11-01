import { DubApiError } from "@/lib/api/errors";
import { deleteWorkspace } from "@/lib/api/workspaces";
import { withWorkspace } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { getFeatureFlags } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { ProgramSchema } from "@/lib/zod/schemas/partners";
import {
  WorkspaceSchema,
  updateWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/workspaces/[idOrSlug] – get a specific workspace by id or slug
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const [domains, programs] = await Promise.all([
      prisma.domain.findMany({
        where: {
          projectId: workspace.id,
        },
        select: {
          slug: true,
          primary: true,
        },
      }),
      prisma.program.findMany({
        where: {
          workspaceId: workspace.id,
        },
      }),
    ]);

    return NextResponse.json(
      WorkspaceSchema.extend({
        programs: z.array(ProgramSchema.pick({ id: true, name: true })),
      }).parse({
        ...workspace,
        id: `ws_${workspace.id}`,
        domains,
        programs,
        flags: await getFeatureFlags({
          workspaceId: workspace.id,
        }),
      }),
      { headers },
    );
  },
  {
    requiredPermissions: ["workspaces.read"],
  },
);

// PATCH /api/workspaces/[idOrSlug] – update a specific workspace by id or slug
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    const { name, slug } = await updateWorkspaceSchema.parseAsync(
      await req.json(),
    );

    try {
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
        // Update the workspace's referral link to use the new slug
        if (workspace.referralLinkId) {
          waitUntil(
            dub.links.update(workspace.referralLinkId, {
              key: slug,
              identifier: slug,
            }),
          );
        }
      }

      return NextResponse.json(
        WorkspaceSchema.parse({
          ...response,
          id: `ws_${response.id}`,
          flags: await getFeatureFlags({
            workspaceId: response.id,
          }),
        }),
      );
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: `The slug "${slug}" is already in use.`,
        });
      } else {
        throw new DubApiError({
          code: "internal_server_error",
          message: error.message,
        });
      }
    }
  },
  {
    requiredPermissions: ["workspaces.write"],
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
    requiredPermissions: ["workspaces.write"],
  },
);
