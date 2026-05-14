import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { getReferredPartnersCountQuerySchema } from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/:programId/referrals/count
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const { country, status, groupBy } =
      getReferredPartnersCountQuerySchema.parse(searchParams);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {},
    });

    if (!programEnrollment.referralRewardId) {
      throw new DubApiError({
        code: "forbidden",
        message: "Referral rewards are not enabled for the partner's group.",
      });
    }

    const baseWhere: Prisma.ProgramEnrollmentWhereInput = {
      programId: programEnrollment.programId,
      applicationEvent: {
        referredByPartnerId: partner.id,
      },
      ...(country &&
        groupBy !== "country" && {
          partner: { country },
        }),
      ...(status &&
        groupBy !== "status" && {
          status,
        }),
    };

    if (groupBy === "status") {
      const data = await prisma.programEnrollment.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: true,
      });

      return NextResponse.json(data);
    }

    if (groupBy === "country") {
      const data = await prisma.partner.groupBy({
        by: ["country"],
        where: {
          country: { not: null },
          programs: {
            some: baseWhere,
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

    const count = await prisma.programEnrollment.count({
      where: baseWhere,
    });

    return NextResponse.json(count);
  },
);
