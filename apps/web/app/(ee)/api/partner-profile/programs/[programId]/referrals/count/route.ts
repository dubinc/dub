import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  getPartnerReferralsCountQuerySchema,
  partnerReferralsCountResponseSchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, ReferralStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/referrals/count - get the count of referrals for the current partner in a program
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { programId } = params;
    const { status, search, groupBy } =
      getPartnerReferralsCountQuerySchema.parse(searchParams);

    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: programId,
      include: {
        program: true,
      },
    });

    const commonWhere: Prisma.PartnerReferralWhereInput = {
      programId: program.id,
      partnerId: partner.id,
      ...(status && groupBy !== "status" && { status }),
      ...(search
        ? search.includes("@")
          ? { email: search }
          : {
              email: { search: sanitizeFullTextSearch(search) },
              name: { search: sanitizeFullTextSearch(search) },
            }
        : {}),
    };

    // Get referral count by status
    if (groupBy === "status") {
      const data = await prisma.partnerReferral.groupBy({
        by: ["status"],
        where: commonWhere,
        _count: true,
        orderBy: {
          _count: {
            status: "desc",
          },
        },
      });

      // Fill in missing statuses with zero counts
      Object.values(ReferralStatus).forEach((status) => {
        if (!data.some((d) => d.status === status)) {
          data.push({ _count: 0, status });
        }
      });

      return NextResponse.json(partnerReferralsCountResponseSchema.parse(data));
    }

    // Get referral count
    const count = await prisma.partnerReferral.count({
      where: commonWhere,
    });

    return NextResponse.json(partnerReferralsCountResponseSchema.parse(count));
  },
);
