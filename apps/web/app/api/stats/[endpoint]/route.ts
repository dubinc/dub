import { withAuth } from "@/lib/auth";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";
import { z } from "zod";

const QueryParamsSchema = z.object({
  domain: z.string().optional(),
  key: z.string().optional(),
  interval: z.enum(["1h", "24h", "7d", "30d", "90d", "all"]).optional(),
});

// GET /api/stats/[endpoint] – get stats for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project }) => {
    try {
      const { endpoint } = params;
      let { domain, key, interval } = QueryParamsSchema.parse(searchParams);

      // TODO: remove this logic after #545 merges
      if (!domain && project.domains.length > 0) {
        domain = project.domains.map((d) => d.slug).join(",");
      }

      // return 403 if project is on the free plan and interval is 90d or all
      if (
        project?.plan === "free" &&
        (interval === "all" || interval === "90d")
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: "Require higher plan",
        });
      }

      const response = await getStats({
        projectId: project.id,
        domain: domain as string,
        key: key as string,
        endpoint,
        interval: interval as string,
        ...searchParams,
      });
      return NextResponse.json(response);
    } catch (err) {
      return handleAndReturnErrorResponse(err);
    }
  },
  {
    needNotExceededClicks: true,
  },
);
