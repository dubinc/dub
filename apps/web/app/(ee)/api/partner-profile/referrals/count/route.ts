import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getNetworkReferralsCountQuerySchema } from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/referrals/count
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  if (!["approved", "trusted"].includes(partner.networkStatus)) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "You must be approved in the Dub Partner Network to view referrals.",
    });
  }

  const { country, groupBy } =
    getNetworkReferralsCountQuerySchema.parse(searchParams);

  const baseWhere: Prisma.PartnerWhereInput = {
    referredByPartnerId: partner.id,
    ...(country &&
      groupBy !== "country" && {
        country,
      }),
  };

  if (groupBy === "country") {
    const data = await prisma.partner.groupBy({
      by: ["country"],
      where: {
        ...baseWhere,
        country: {
          not: null,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
    });

    return NextResponse.json(data);
  }

  const count = await prisma.partner.count({
    where: baseWhere,
  });

  return NextResponse.json(count);
});
