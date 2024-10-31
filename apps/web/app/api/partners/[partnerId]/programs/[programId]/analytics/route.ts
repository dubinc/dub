import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId]/analytics – get analytics for a program enrollment link
export const GET = withPartner(async ({ partner, params, searchParams }) => {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: params.programId,
      },
    },
    include: {
      program: true,
      link: true,
    },
  });

  if (!programEnrollment || !programEnrollment.program) {
    throw new DubApiError({
      code: "not_found",
      message:
        "You are not enrolled in this program. Contact your program admin to get enrolled.",
    });
  }

  const { link, program } = programEnrollment;

  if (!link) {
    throw new DubApiError({
      code: "not_found",
      message:
        "You don't have a link for this program yet. Contact your program admin to get one.",
    });
  }

  const parsedParams = analyticsQuerySchema.parse(searchParams);

  const response = await getAnalytics({
    ...parsedParams,
    linkId: link.id,
  });

  const getEarnings = (item: any) => {
    return program.commissionType === "percentage"
      ? (item.saleAmount / 100) * program.commissionAmount
      : program.commissionAmount * item.sales;
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
