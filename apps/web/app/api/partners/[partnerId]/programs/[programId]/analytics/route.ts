import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { calculateEarnings } from "@/lib/api/sales/commission";
import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId]/analytics – get analytics for a program enrollment link
export const GET = withPartner(async ({ partner, params, searchParams }) => {
  const idOrSlug = params.programId;

  let programId: string | undefined;
  let programSlug: string | undefined;

  idOrSlug.startsWith("prog_")
    ? (programId = idOrSlug)
    : (programSlug = idOrSlug);

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId || undefined,
      slug: programSlug || undefined,
    },
  });

  const { link } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: program.id,
  });

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
