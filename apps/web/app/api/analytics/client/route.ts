import { getAnalytics } from "@/lib/analytics/get-analytics";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { withEmbedToken } from "@/lib/embed/auth";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/analytics/client - get analytics for the current link
export const GET = withEmbedToken(async ({ link, searchParams, program }) => {
  const parsedParams = analyticsQuerySchema
    .pick({
      event: true,
      start: true,
      end: true,
      interval: true,
      groupBy: true,
      timezone: true,
    })
    .parse(searchParams);

  const response = await getAnalytics({
    ...parsedParams,
    linkId: link.id,
  });

  let data;

  if (response instanceof Array) {
    data = response.map((item) => {
      return {
        ...item,
        earnings: calculateEarnings({
          program,
          sales: item.sales ?? 0,
          saleAmount: item.saleAmount ?? 0,
        }),
      };
    });
  } else {
    data = {
      ...response,
      earnings: calculateEarnings({
        program,
        sales: response.sales,
        saleAmount: response.saleAmount,
      }),
    };
  }

  return NextResponse.json(data);
});
