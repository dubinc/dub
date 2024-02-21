import { VALID_TINYBIRD_ENDPOINTS, getAnalytics } from "@/lib/analytics";
import { withAuth } from "@/lib/auth";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import { getDomainViaEdge } from "@/lib/planetscale";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

export const endpointSchema = z.object({
  endpoint: z.enum(VALID_TINYBIRD_ENDPOINTS, {
    errorMap: (issue, ctx) => {
      return {
        message: `Invalid endpoint. Valid endpoints are: ${VALID_TINYBIRD_ENDPOINTS.join(", ")}`,
      };
    },
  }),
});

// GET /api/analytics/[endpoint] – get analytics for a specific endpoint
export const GET = withAuth(
  async ({ params, searchParams, project, link }) => {
    try {
      const { endpoint } = endpointSchema.parse(params);
      const parsedParams = getAnalyticsQuerySchema.parse(searchParams);
      const { domain, key, interval } = parsedParams;

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

      const linkId = link
        ? link.id
        : domain && key === "_root"
          ? await getDomainViaEdge(domain).then((d) => d?.id)
          : null;

      const response = await getAnalytics({
        projectId: project.id,
        ...(linkId && { linkId }),
        endpoint,
        ...parsedParams,
      });
      return NextResponse.json(response);
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    needNotExceededClicks: true,
  },
);
