import { getEvents } from "@/lib/analytics/get-events";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { withPartner } from "@/lib/auth/partner";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId]/events – get events for a program enrollment link
export const GET = withPartner(async ({ partner, params, searchParams }) => {
  const { link, program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

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
            saleAmount: item.saleAmount ?? 0,
          }),
        }),
      };
    }),
  );
});
