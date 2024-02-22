import { getAnalytics } from "@/lib/analytics";
import { exceededLimitError } from "@/lib/api/errors";
import { isBlacklistedReferrer } from "@/lib/edge-config";
import { getDomainOrLink, getProjectViaEdge } from "@/lib/planetscale";
import { ratelimit } from "@/lib/upstash";
import {
  DEMO_LINK_ID,
  DUB_PROJECT_ID,
  LOCALHOST_IP,
  getSearchParams,
} from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

export const GET = async (
  req: NextRequest,
  { params }: { params: Record<string, string> },
) => {
  const { endpoint } = params;
  const searchParams = getSearchParams(req.url);
  const { domain, key, interval } = searchParams;

  let link;

  // demo link (dub.sh/try)
  if (domain === "dub.sh" && key === "try") {
    // Rate limit in production
    if (process.env.NODE_ENV !== "development") {
      if (await isBlacklistedReferrer(req.headers.get("referer"))) {
        return new Response("Don't DDoS me pls 🥺", { status: 429 });
      }
      const ip = ipAddress(req) || LOCALHOST_IP;
      const { success } = await ratelimit(
        15,
        endpoint === "clicks" ? "10 s" : "1 h",
      ).limit(`${ip}:${domain}:${key}:${endpoint}`);

      if (!success) {
        return new Response("Don't DDoS me pls 🥺", { status: 429 });
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
      return new Response(`Analytics for this link are not public`, {
        status: 403,
      });
    }
    const project =
      link?.projectId && (await getProjectViaEdge(link.projectId));
    if (
      (!project || project.plan === "free") &&
      (interval === "all" || interval === "90d")
    ) {
      return new Response("Unauthorized: Need higher plan.", { status: 403 });
    }
    if (project && project.usage > project.usageLimit) {
      return new Response(
        exceededLimitError({
          plan: project.plan,
          limit: project.usageLimit,
          type: "clicks",
        }),
        { status: 403 },
      );
    }
  }

  const response = await getAnalytics({
    // projectId can be undefined (for public links that haven't been claimed/synced to a project)
    ...(link.projectId && { projectId: link.projectId }),
    linkId: link.id,
    endpoint,
    interval,
    ...searchParams,
  });

  return NextResponse.json(response);
};
