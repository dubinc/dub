import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { withPartner } from "@/lib/auth/partner";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId]/analytics – get analytics for a program enrollment link
export const GET = withPartner(async ({ partner, params, searchParams }) => {
  const { link, program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message:
        "You don't have a link for this program yet. Contact your program admin to get one.",
    });
  }

  const parsedParams = analyticsQuerySchema
    .omit({
      domain: true,
      key: true,
      linkId: true,
      externalId: true,
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
