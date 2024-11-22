import { getEvents } from "@/lib/analytics/get-events";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { withEmbedToken } from "@/lib/referrals/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/events/client - get events for the current link
export const GET = withEmbedToken(async ({ searchParams, program, link }) => {
  const parsedParams = eventsQuerySchema
    .omit({
      linkId: true,
      externalId: true,
      domain: true,
      root: true,
      key: true,
      tagId: true,
    })
    .parse(searchParams);

  // TODO:
  // Replace with sales data

  const response = await getEvents({
    ...parsedParams,
    linkId: link.id,
  });

  return NextResponse.json(
    response.map((item: any) => {
      return {
        ...item,
        ...(parsedParams.event === "sales" && {
          earnings: calculateEarnings({
            program,
            sales: item.sales ?? 0,
            saleAmount: item.sale?.amount ?? 0,
          }),
        }),
      };
    }),
  );
});
