import { withAuth } from "@/lib/auth";
import { DubApiError, ErrorResponse, handleApiError } from "@/lib/errors";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";
import { z } from "zod";

const QueryParamsSchema = z.object({
  domain: z.string().min(1),
  key: z.string().optional(),
  interval: z.enum(["all", "90d"]),
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
        domain,
        key: key as string,
        endpoint,
        interval,
        ...searchParams,
      });
      return NextResponse.json(response);
    } catch (err) {
      const { error, status } = handleApiError(err);
      return NextResponse.json<ErrorResponse>({ error }, { status });
    }
  },
  {
    needNotExceededClicks: true,
  },
);
