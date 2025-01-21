import { DubApiError } from "@/lib/api/errors";
import { deleteWorkspace } from "@/lib/api/workspaces";
import { withWorkspace } from "@/lib/auth";
import { getFeatureFlags } from "@/lib/edge-config";
import { storage } from "@/lib/storage";
import {
  updateWorkspaceSchema,
  WorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug] – get a specific workspace by id or slug
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const [domains, yearInReviews] = await Promise.all([
      prisma.domain.findMany({
        where: {
          projectId: workspace.id,
        },
        select: {
          slug: true,
          primary: true,
        },
        take: 100,
      }),
      prisma.yearInReview.findMany({
        where: {
          workspaceId: workspace.id,
          year: 2024,
        },
      }),
    ]);

    return NextResponse.json(
      {
        ...WorkspaceSchema.parse({
          ...workspace,
          id: `ws_${workspace.id}`,
          domains,
          flags: await getFeatureFlags({
            workspaceId: workspace.id,
          }),
        }),
        yearInReview: yearInReviews.length > 0 ? yearInReviews[0] : null,
      },
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
    const { name, slug, logo, conversionEnabled } =
      await updateWorkspaceSchema.parseAsync(await req.json());

    const logoUploaded = logo
      ? await storage.upload(
          `workspaces/ws_${workspace.id}/logo_${nanoid(7)}`,
          logo,
        )
      : null;

    try {
      const response = await prisma.project.update({
        where: {
          slug: workspace.slug,
        },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(logoUploaded && { logo: logoUploaded.url }),
          ...(conversionEnabled !== undefined && { conversionEnabled }),
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

      waitUntil(
        (async () => {
          if (logoUploaded && workspace.logo) {
            await storage.delete(workspace.logo.replace(`${R2_URL}/`, ""));
          }
        })(),
      );

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
