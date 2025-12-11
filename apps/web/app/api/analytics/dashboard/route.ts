import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import { PlanProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { DUB_DEMO_LINKS, DUB_WORKSPACE_ID, getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/analytics/dashboard – get analytics for the dashboard
export const GET = async (req: Request) => {
  try {
    const searchParams = getSearchParams(req.url);
    const parsedParams = analyticsQuerySchema.parse(searchParams);

    const { domain, key, folderId, interval, start, end } = parsedParams;

    if ((!domain || !key) && !folderId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing domain/key or folderId query parameters",
      });
    }

    let demoLink, link, folder, workspace;

    if (folderId) {
      // Folder
      folder = await prisma.folder.findUnique({
        where: {
          id: folderId,
        },
        select: {
          id: true,
          dashboard: true,
          projectId: true,
          project: {
            select: {
              id: true,
              plan: true,
              usage: true,
              usageLimit: true,
              createdAt: true,
            },
          },
          ...(domain && key
            ? {
                links: {
                  select: { id: true },
                  where: {
                    domain,
                    key,
                  },
                },
              }
            : {}),
        },
      });

      if (!folder?.dashboard) {
        throw new DubApiError({
          code: "forbidden",
          message: "This folder does not have a public analytics dashboard",
        });
      }

      workspace = folder.project;

      if ("links" in folder && folder.links?.length) link = folder.links[0];
    } else {
      // Link
      demoLink = DUB_DEMO_LINKS.find(
        (l) => l.domain === domain && l.key === key,
      );

      // if it's a demo link
      if (demoLink) {
        link = {
          id: demoLink.id,
          projectId: DUB_WORKSPACE_ID,
        };
      } else {
        link = await prisma.link.findUnique({
          where: {
            domain_key: { domain: domain!, key: key! },
          },
          select: {
            id: true,
            dashboard: true,
            projectId: true,
            project: {
              select: {
                id: true,
                plan: true,
                usage: true,
                usageLimit: true,
                createdAt: true,
              },
            },
          },
        });

        if (!link?.dashboard) {
          throw new DubApiError({
            code: "forbidden",
            message: "This link does not have a public analytics dashboard",
          });
        }

        workspace = link.project;
      }
    }

    assertValidDateRangeForPlan({
      plan: workspace?.plan || "free",
      dataAvailableFrom: workspace?.createdAt,
      interval,
      start,
      end,
    });

    if (workspace && workspace.usage > workspace.usageLimit) {
      throw new DubApiError({
        code: "forbidden",
        message: exceededLimitError({
          plan: workspace.plan as PlanProps,
          limit: workspace.usageLimit,
          type: "clicks",
        }),
      });
    }

    // Create cache key based on all parameters that affect the result
    const cacheKey = `analyticsDashboardCache:${JSON.stringify(parsedParams)}`;

    // Check if results exist in cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(
        `[Analytics Dashboard] Cache hit: ${JSON.stringify(parsedParams, null, 2)}`,
      );
      return NextResponse.json(cached);
    }

    console.log(
      `[Analytics Dashboard] Cache miss: ${JSON.stringify(parsedParams, null, 2)}`,
    );

    const response = await getAnalytics({
      ...parsedParams,
      // workspaceId can be undefined (for public links that haven't been claimed/synced to a workspace)
      ...(workspace && { workspaceId: workspace.id }),
      ...(folder && { folderId: folder.id }),
      ...(link && { linkId: link.id }),
    });

    // Cache the response for 1 minute
    console.log(
      `[Analytics Dashboard] Caching response for ${JSON.stringify(parsedParams, null, 2)}`,
    );
    waitUntil(await redis.set(cacheKey, response, { ex: 60 }));

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
