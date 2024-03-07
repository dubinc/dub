import { getAnalytics } from "@/lib/analytics";
import {
  DubApiError,
  exceededLimitError,
  handleAndReturnErrorResponse,
} from "@/lib/api/errors";
import { getIdentityHash } from "@/lib/edge";
import { isBlacklistedReferrer } from "@/lib/edge-config";
import { getDomainOrLink, getProjectViaEdge } from "@/lib/planetscale";
import { ratelimit } from "@/lib/upstash";
import { DEMO_LINK_ID, DUB_PROJECT_ID, getSearchParams } from "@dub/utils";
import { NextResponse, type NextRequest } from "next/server";
import {
  getAnalyticsEdgeQuerySchema,
  analyticsEndpointSchema,
} from "@/lib/zod/schemas/analytics";

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

    // demo link (dub.sh/try)
    if (domain === "dub.sh" && key === "try") {
      // Rate limit in production
      if (process.env.NODE_ENV !== "development") {
        if (await isBlacklistedReferrer(req.headers.get("referer"))) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Don't DDoS me pls 🥺",
          });
        }
        const identity_hash = await getIdentityHash(req);
        const { success } = await ratelimit(
          15,
          endpoint === "clicks" ? "10 s" : "1 h",
        ).limit(`demo-analytics:${identity_hash}:${endpoint}`);

        if (!success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Don't DDoS me pls 🥺",
          });
        }
      }
      link = {
        id: DEMO_LINK_ID,
        projectId: DUB_PROJECT_ID,
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
      const project =
        link?.projectId && (await getProjectViaEdge(link.projectId));
      if (
        (!project || project.plan === "free") &&
        (interval === "all" || interval === "90d")
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: "Need higher plan",
        });
      }
      if (project && project.usage > project.usageLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: project.plan,
            limit: project.usageLimit,
            type: "clicks",
          }),
        });
      }
    }

    const response = await getAnalytics({
      // projectId can be undefined (for public links that haven't been claimed/synced to a project)
      ...(link.projectId && { projectId: link.projectId }),
      linkId: link.id,
      endpoint,
      ...parsedParams,
    });

    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
