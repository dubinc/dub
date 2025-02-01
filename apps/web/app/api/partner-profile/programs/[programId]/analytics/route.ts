import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { calculateEarnings } from "@/lib/api/sales/calculate-earnings";
import { withPartnerProfile } from "@/lib/auth/partner";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/analytics – get analytics for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const parsedParams = analyticsQuerySchema
      .omit({
        workspaceId: true,
        domain: true,
        key: true,
        linkId: true,
        externalId: true,
        tenantId: true,
      })
      .parse(searchParams);

    const response = await getAnalytics({
      ...parsedParams,
      programId: program.id,
      partnerId: partner.id,
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
  },
);
