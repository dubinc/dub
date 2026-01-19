import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  getPartnerReferralsCountQuerySchema,
  partnerReferralsCountResponseSchema,
} from "@/lib/zod/schemas/referrals";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import { Prisma, ReferralStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/programs/referrals/count - get the count of partner referrals for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, status, search, groupBy } =
      getPartnerReferralsCountQuerySchema.parse(searchParams);

    const commonWhere: Prisma.PartnerReferralWhereInput = {
      programId,
      ...(partnerId && groupBy !== "partnerId" && { partnerId }),
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

    // Get referral count by partnerId
    if (groupBy === "partnerId") {
      const data = await prisma.partnerReferral.groupBy({
        by: ["partnerId"],
        where: commonWhere,
        _count: true,
        orderBy: {
          _count: {
            partnerId: "desc",
          },
        },
        take: 10000,
      });

      return NextResponse.json(partnerReferralsCountResponseSchema.parse(data));
    }

    // Get referral count
    const count = await prisma.partnerReferral.count({
      where: commonWhere,
    });

    return NextResponse.json(partnerReferralsCountResponseSchema.parse(count));
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
