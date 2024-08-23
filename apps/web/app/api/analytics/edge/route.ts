import { getAnalytics } from "@/lib/analytics/get-analytics";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import {
  DubApiError,
  exceededLimitError,
  handleAndReturnErrorResponse,
} from "@/lib/api/errors";
import { getLinkViaEdge, getWorkspaceViaEdge } from "@/lib/planetscale";
import { getWorkspaceClicksLimit } from "@/lib/referrals";
import { ratelimit } from "@/lib/upstash";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { DUB_DEMO_LINKS, DUB_WORKSPACE_ID, getSearchParams } from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

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

    let link;

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
    } else if (domain) {
      link = await getLinkViaEdge(domain, key);

      // if the link is explicitly private (publicStats === false)
      if (!link?.publicStats) {
        throw new DubApiError({
          code: "forbidden",
          message: "Analytics for this link are not public",
        });
      }
      const workspace =
        link?.projectId && (await getWorkspaceViaEdge(link.projectId));

      validDateRangeForPlan({
        plan: workspace?.plan || "free",
        interval,
        start,
        end,
        throwError: true,
      });

      const clicksLimit = getWorkspaceClicksLimit(workspace);

      if (workspace && workspace.usage > clicksLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: workspace.plan,
            limit: clicksLimit,
            type: "clicks",
          }),
        });
      }
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
