import { getEvents } from "@/lib/analytics/get-events";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
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

  const getEarnings = (item: any) => {
    return program.commissionType === "percentage"
      ? item.sale.amount * (program.commissionAmount / 100)
      : item.sales * program.commissionAmount;
  };

  return NextResponse.json(
    response.map((item) => {
      return {
        ...item,
        ...(parsedParams.event === "sales" && {
          earnings: getEarnings(item),
        }),
      };
    }),
  );
});
