import { getEvents } from "@/lib/analytics/get-events";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { withAuth } from "@/lib/referrals/auth";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/events/client - get events for the current link
export const GET = withAuth(async ({ searchParams, program, link }) => {
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

  const response = await getEvents({
    ...parsedParams,
    linkId: link.id,
    obfuscateData: true,
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
