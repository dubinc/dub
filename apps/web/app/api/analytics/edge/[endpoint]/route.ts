import { getAnalytics } from "@/lib/analytics";
import {
  DubApiError,
  exceededLimitError,
  handleAndReturnErrorResponse,
} from "@/lib/api/errors";
import { getIdentityHash } from "@/lib/edge";
import { getDomainOrLink, getWorkspaceViaEdge } from "@/lib/planetscale";
import { ratelimit } from "@/lib/upstash";
import {
  analyticsEndpointSchema,
  getAnalyticsEdgeQuerySchema,
} from "@/lib/zod/schemas/analytics";
import { DUB_DEMO_LINKS, DUB_WORKSPACE_ID, getSearchParams } from "@dub/utils";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

export const GET = async (
  req: NextRequest,
  { params }: { params: Record<string, string> },
) => {
  try {
    const searchParams = getSearchParams(req.url);
    const { endpoint } = analyticsEndpointSchema.parse(params);
    const parsedParams = getAnalyticsEdgeQuerySchema.parse(searchParams);
    const { domain, key, interval } = parsedParams;

    let link;

    const demoLink = DUB_DEMO_LINKS.find(
      (l) => l.domain === domain && l.key === key,
    );

    // if it's a demo link
    if (demoLink) {
      // Rate limit in production
      if (process.env.NODE_ENV !== "development") {
        const identity_hash = await getIdentityHash(req);
        const { success } = await ratelimit(
          15,
          endpoint === "clicks" ? "10 s" : "1 m",
        ).limit(`demo-analytics:${demoLink.id}:${identity_hash}:${endpoint}`);

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
    } else {
      link = await getDomainOrLink({ domain, key });
      // if the link is explicitly private (publicStats === false)
      if (!link?.publicStats) {
        throw new DubApiError({
          code: "forbidden",
          message: "Analytics for this link are not public",
        });
      }
      const workspace =
        link?.projectId && (await getWorkspaceViaEdge(link.projectId));
      if (
        (!workspace || workspace.plan === "free") &&
        (interval === "all" || interval === "90d")
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: "Need higher plan",
        });
      }
      if (workspace && workspace.usage > workspace.usageLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: workspace.plan,
            limit: workspace.usageLimit,
            type: "clicks",
          }),
        });
      }
    }

    const response = await getAnalytics({
      // workspaceId can be undefined (for public links that haven't been claimed/synced to a workspace)
      ...(link.projectId && { workspaceId: link.projectId }),
      linkId: link.id,
      endpoint,
      ...parsedParams,
    });

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
