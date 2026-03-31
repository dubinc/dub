import { allowedHostnamesCache } from "@/lib/analytics/allowed-hostnames-cache";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { validateAllowedHostnames } from "@/lib/api/validate-allowed-hostnames";
import { deleteWorkspace } from "@/lib/api/workspaces/delete-workspace";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { getFeatureFlags } from "@/lib/edge-config";
import { jackson } from "@/lib/jackson";
import { mergeSiteVisitTrackingSettings } from "@/lib/sitemaps/site-visit-tracking";
import { storage } from "@/lib/storage";
import { redis } from "@/lib/upstash";
import {
  createWorkspaceSchema,
  siteVisitTrackingSettingsPatchSchema,
  WorkspaceSchema,
  WorkspaceSchemaExtended,
} from "@/lib/zod/schemas/workspaces";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { nanoid, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const updateWorkspaceSchema = createWorkspaceSchema
  .extend({
    allowedHostnames: z.array(z.string()).optional(),
    publishableKey: z
      .union([
        z
          .string()
          .regex(
            /^dub_pk_[A-Za-z0-9_-]{16,64}$/,
            "Invalid publishable key format",
          ),
        z.null(),
      ])
      .optional(),
    enforceSAML: z.boolean().nullish(),
    siteVisitTrackingSettings: siteVisitTrackingSettingsPatchSchema
      .nullable()
      .optional(),
  })
  .partial();

// GET /api/workspaces/[idOrSlug] – get a specific workspace by id or slug
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const domains = await prisma.domain.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        id: true,
        slug: true,
        primary: true,
        verified: true,
        linkRetentionDays: true,
      },
      take: 100,
    });

    const flags = await getFeatureFlags({
      workspaceId: workspace.id,
    });

    return NextResponse.json(
      {
        ...WorkspaceSchemaExtended.parse({
          ...workspace,
          id: prefixWorkspaceId(workspace.id),
          domains,
          flags,
        }),
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
    const {
      name,
      slug,
      logo,
      conversionEnabled,
      allowedHostnames,
      publishableKey,
      enforceSAML,
      siteVisitTrackingSettings,
    } = await updateWorkspaceSchema.parseAsync(await parseRequestBody(req));

    if (["free", "pro"].includes(workspace.plan) && conversionEnabled) {
      throw new DubApiError({
        code: "forbidden",
        message: "Conversion tracking is not available on free or pro plans.",
      });
    }

    const validHostnames = allowedHostnames
      ? validateAllowedHostnames(allowedHostnames)
      : undefined;

    const logoUploaded = logo
      ? await storage.upload({
          key: `workspaces/${prefixWorkspaceId(workspace.id)}/logo_${nanoid(7)}`,
          body: logo,
        })
      : null;

    if (enforceSAML) {
      if (workspace.plan !== "enterprise") {
        throw new DubApiError({
          code: "forbidden",
          message: "SAML SSO is only available on enterprise plans.",
        });
      }

      const { apiController } = await jackson();

      const connections = await apiController.getConnections({
        tenant: workspace.id,
        product: "Dub",
      });

      if (connections.length === 0) {
        throw new DubApiError({
          code: "forbidden",
          message: "SAML SSO is not configured for this workspace.",
        });
      }
    }

    const mergedSiteVisitTrackingSettings =
      siteVisitTrackingSettings !== undefined
        ? mergeSiteVisitTrackingSettings(
            workspace.siteVisitTrackingSettings,
            siteVisitTrackingSettings,
          )
        : undefined;

    if (
      mergedSiteVisitTrackingSettings !== undefined &&
      mergedSiteVisitTrackingSettings !== null &&
      mergedSiteVisitTrackingSettings.siteDomainSlug
    ) {
      const domain = await prisma.domain.findFirst({
        where: {
          projectId: workspace.id,
          slug: mergedSiteVisitTrackingSettings.siteDomainSlug,
          archived: false,
        },
      });

      if (!domain) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "The selected site links domain was not found for this workspace.",
        });
      }

      if (!domain.verified) {
        throw new DubApiError({
          code: "bad_request",
          message: "The site links domain must be verified before use.",
        });
      }
    }

    try {
      const updatedWorkspace = await prisma.project.update({
        where: {
          slug: workspace.slug,
        },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(logoUploaded && { logo: logoUploaded.url }),
          ...(conversionEnabled !== undefined && { conversionEnabled }),
          ...(validHostnames !== undefined && {
            allowedHostnames: validHostnames,
          }),
          ...(publishableKey !== undefined && { publishableKey }),
          ...(enforceSAML !== undefined && {
            ssoEnforcedAt: enforceSAML ? new Date() : null,
          }),
          ...(mergedSiteVisitTrackingSettings !== undefined && {
            siteVisitTrackingSettings:
              mergedSiteVisitTrackingSettings === null
                ? Prisma.JsonNull
                : (mergedSiteVisitTrackingSettings as Prisma.InputJsonValue),
          }),
        },
        include: {
          domains: {
            select: {
              slug: true,
              primary: true,
              verified: true,
            },
            take: 100,
          },
          users: true,
        },
      });

      if (updatedWorkspace.slug !== workspace.slug) {
        await Promise.allSettled([
          prisma.user.updateMany({
            where: {
              defaultWorkspace: workspace.slug,
            },
            data: {
              defaultWorkspace: updatedWorkspace.slug,
            },
          }),
          // refresh the workspace product cache for both workspaces
          redis.del(
            `workspace:product:${updatedWorkspace.slug}`,
            `workspace:product:${workspace.slug}`,
          ),
        ]);
      }

      waitUntil(
        (async () => {
          if (logoUploaded && workspace.logo) {
            await storage.delete({
              key: workspace.logo.replace(`${R2_URL}/`, ""),
            });
          }

          // Sync the allowedHostnames cache for workspace domains
          const current = JSON.stringify(workspace.allowedHostnames);
          const next = JSON.stringify(updatedWorkspace.allowedHostnames);
          const domains = updatedWorkspace.domains.map(({ slug }) => slug);

          if (current !== next) {
            if (
              Array.isArray(updatedWorkspace.allowedHostnames) &&
              updatedWorkspace.allowedHostnames.length > 0
            ) {
              allowedHostnamesCache.mset({
                allowedHostnames: next,
                domains,
              });
            } else {
              allowedHostnamesCache.deleteMany({
                domains,
              });
            }
          }
        })(),
      );

      return NextResponse.json(
        WorkspaceSchema.parse({
          ...updatedWorkspace,
          id: prefixWorkspaceId(updatedWorkspace.id),
          flags: await getFeatureFlags({
            workspaceId: updatedWorkspace.id,
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
    if (workspace.defaultProgramId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You cannot delete a workspace with an active partner program.",
      });
    }

    await deleteWorkspace(workspace);

    return NextResponse.json(workspace);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
