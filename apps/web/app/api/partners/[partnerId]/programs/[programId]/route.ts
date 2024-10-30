import { DubApiError } from "@/lib/api/errors";
import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId]
export const GET = withPartner(async ({ partner, params }) => {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: params.programId,
      },
    },
    include: {
      link: true,
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "You're not enrolled in this program",
    });
  }

  const { link } = programEnrollment;

  return NextResponse.json({
    url: link?.url,
    shortLink: link?.shortLink,
    clicks: link?.clicks,
    leads: link?.leads,
    sales: link?.sales,
    saleAmount: link?.saleAmount,
  });
});
