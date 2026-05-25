import { DubApiError } from "@/lib/api/errors";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  getReferredPartnersQuerySchema,
  referredPartnerSchema,
} from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/:programId/referrals
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const {
      country,
      status,
      page = 1,
      pageSize,
    } = getReferredPartnersQuerySchema.parse(searchParams);

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

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: programEnrollment.programId,
        applicationEvent: {
          referredByPartnerId: partner.id,
        },
        ...(status && { status }),
        ...(country && {
          partner: { country },
        }),
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            country: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const commissionsMap = new Map<string, number>();

    if (enrollments.length > 0) {
      const commissions = await prisma.commission.groupBy({
        by: ["sourcePartnerId"],
        where: {
          programId: programEnrollment.programId,
          partnerId: partner.id,
          type: CommissionType.referral,
          sourcePartnerId: {
            in: enrollments.map((e) => e.partner.id),
          },
        },
        _sum: {
          earnings: true,
        },
      });

      for (const commission of commissions) {
        if (commission.sourcePartnerId) {
          commissionsMap.set(
            commission.sourcePartnerId,
            commission._sum.earnings ?? 0,
          );
        }
      }
    }

    const result = enrollments.map((enrollment) => ({
      id: enrollment.partner.id,
      email: obfuscateCustomerEmail(enrollment.partner.email ?? ""),
      country: enrollment.partner.country,
      programEnrollment: {
        ...enrollment,
        earnings: commissionsMap.get(enrollment.partner.id) ?? 0,
      },
    }));

    return NextResponse.json(z.array(referredPartnerSchema).parse(result));
  },
);
