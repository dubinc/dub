import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { exceededLimitError } from "@/lib/exceeded-limit-error";
import { PlanProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { DUB_DEMO_LINKS, DUB_WORKSPACE_ID, getSearchParams } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/analytics/dashboard – get analytics for the dashboard
export const GET = async (req: Request) => {
  try {
    const searchParams = getSearchParams(req.url);
    const parsedParams = analyticsQuerySchema.parse(searchParams);

    const { groupBy, domain, key, folderId, interval, start, end } =
      parsedParams;

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
              plan: true,
              usage: true,
              usageLimit: true,
            },
          },
          ...(domain && key ? { links: { select: { id: true } } } : {}),
        },
      });

      if (!folder?.dashboard) {
        throw new DubApiError({
          code: "forbidden",
          message: "This folder does not have a public analytics dashboard",
        });
      }

      workspace = folder.project;

      if ("links" in folder && folder.links.length) link = folder.links[0];
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
                plan: true,
                usage: true,
                usageLimit: true,
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

    // Rate limit in production
    if (process.env.NODE_ENV !== "development") {
      const ip = ipAddress(req);
      // for demo links, we rate limit at:
      // - 15 requests per 10 seconds if groupBy is "count"
      // - 15 request per minute if groupBy is not "count"
      // for non-demo links, we rate limit at 10 requests per 10 seconds
      const { success } = await ratelimit(
        demoLink ? 15 : 10,
        !demoLink || groupBy === "count" ? "10 s" : "1 m",
      ).limit(`analytics-dashboard:${link.id}:${ip}:${groupBy}`);

      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message: "Don't DDoS me pls 🥺",
        });
      }
    }

    const response = await getAnalytics({
      ...parsedParams,
      // workspaceId can be undefined (for public links that haven't been claimed/synced to a workspace)
      ...(workspace && { workspaceId: workspace.id }),
      ...(folder && { folderId: folder.id }),
      ...(link && { linkId: link.id }),
    });

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
