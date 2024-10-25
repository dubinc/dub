import { getAnalytics } from "@/lib/analytics/get-analytics";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import {
  DubApiError,
  exceededLimitError,
  handleAndReturnErrorResponse,
} from "@/lib/api/errors";
import { conn } from "@/lib/planetscale/connection";
import { PlanProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { DUB_DEMO_LINKS, DUB_WORKSPACE_ID, getSearchParams } from "@dub/utils";
import { Link, Project } from "@prisma/client";
import { ipAddress } from "@vercel/functions";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

type LinkWithWorkspace = Pick<Link, "id" | "projectId"> &
  Pick<Project, "plan" | "usage" | "usageLimit"> & {
    sharedDashboardId: string;
  };

export const GET = async (req: NextRequest) => {
  try {
    const searchParams = getSearchParams(req.url);
    const parsedParams = analyticsQuerySchema.parse(searchParams);

    const { groupBy, domain, key, interval, start, end } = parsedParams;

    if (!domain || !key) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing domain or key query parameter",
      });
    }

    let link: Pick<Link, "id" | "projectId"> | null = null;

    const demoLink = DUB_DEMO_LINKS.find(
      (l) => l.domain === domain && l.key === key,
    );

    // if it's a demo link
    if (demoLink) {
      // Rate limit in production
      if (process.env.NODE_ENV !== "development") {
        const ip = ipAddress(req);
        const { success } = await ratelimit(
          15,
          groupBy === "count" ? "10 s" : "1 m",
        ).limit(`demo-analytics:${demoLink.id}:${ip}:${groupBy}`);

        if (!success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Don't DDoS me pls 🥺",
          });
        }
      }

      link = {
        id: demoLink.id,
        projectId: DUB_WORKSPACE_ID,
      };
    }

    // Find the link by domain and key
    else {
      // TODO:
      // Move this to '/lib/planetscale'
      const { rows } = await conn.execute<LinkWithWorkspace>(
        `SELECT Link.id, Link.projectId, Project.plan, Project.usage, Project.usageLimit, SharedDashboard.id AS sharedDashboardId
         FROM Link 
         LEFT JOIN Project ON Link.projectId = Project.id 
         LEFT JOIN SharedDashboard ON Link.id = SharedDashboard.linkId
         WHERE Link.domain = ? AND Link.key = ? 
         LIMIT 1`,
        [domain, key],
      );

      if (!rows || rows.length === 0) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }

      const linkFound = rows[0];

      // if the link is explicitly private (publicStats === false)
      if (!linkFound.sharedDashboardId) {
        throw new DubApiError({
          code: "forbidden",
          message: "This link does not have a public analytics dashboard",
        });
      }

      const { plan, usage, usageLimit, projectId } = linkFound;

      validDateRangeForPlan({
        plan: plan || "free",
        interval,
        start,
        end,
        throwError: true,
      });

      // Check if the project has exceeded its usage limit if projectId is defined
      if (projectId && usage > usageLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: plan as PlanProps,
            limit: usageLimit,
            type: "clicks",
          }),
        });
      }

      link = {
        id: linkFound.id,
        projectId: linkFound.projectId,
      };
    }

    const response = await getAnalytics({
      ...parsedParams,
      // workspaceId can be undefined (for public links that haven't been claimed/synced to a workspace)
      ...(link.projectId && { workspaceId: link.projectId }),
      linkId: link.id,
    });

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
