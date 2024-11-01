import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
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

  const getEarnings = (item: any) => {
    return (
      (program.commissionType === "percentage"
        ? item.sale.amount
        : item.sales) *
      (program.commissionAmount / 100) // commission amount is either a percentage of amount in cents
    );
  };

  let data;

  if (response instanceof Array) {
    data = response.map((item) => {
      return {
        ...item,
        earnings: getEarnings(item),
      };
    });
  } else {
    data = {
      ...response,
      earnings: getEarnings(response),
    };
  }

  return NextResponse.json(data);
});
