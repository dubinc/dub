import { getProgramEnrollmentsWhere } from "@/lib/api/partner-profile/get-program-enrollments-where";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import {
  PartnerProfileProgramEnrollmentSchema,
  partnerProfileProgramsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { Prisma, Reward } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// the program columns that ProgramSchema returns. The program also has large
// JSON columns (inviteEmailData, embedData, resources) that the response drops.
const PROGRAM_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  domain: true,
  url: true,
  description: true,
  primaryRewardEvent: true,
  minPayoutAmount: true,
  addedToMarketplaceAt: true,
  messagingEnabledAt: true,
  partnerNetworkEnabledAt: true,
  payoutMode: true,
  defaultFolderId: true,
  defaultGroupId: true,
  supportEmail: true,
  helpUrl: true,
  termsUrl: true,
  applicationRequirements: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  deactivatedAt: true,
} satisfies Prisma.ProgramSelect;

// GET /api/partner-profile/programs - get all program enrollments for a given partnerId
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  const {
    includeRewardsDiscounts,
    status,
    search,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = partnerProfileProgramsQuerySchema.parse(searchParams);

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: getProgramEnrollmentsWhere({
      partnerId: partner.id,
      status,
      search,
    }),
    include: {
      links: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
      },
      program: {
        select: PROGRAM_SELECT,
      },
      application: {
        select: {
          rejectionReason: true,
          rejectionNote: true,
          reviewedAt: true,
        },
      },
      ...(includeRewardsDiscounts && {
        clickReward: true,
        leadReward: true,
        saleReward: true,
        referralReward: true,
        customReward: true,
        discount: true,
      }),
    },
    orderBy: [
      sortBy === "name"
        ? { program: { name: sortOrder } }
        : { totalCommissions: sortOrder },
      {
        program: {
          marketplaceRanking: "asc",
        },
      },
      {
        createdAt: "desc",
      },
      // keeps the order stable across pages
      {
        id: "asc",
      },
    ],
    ...(page && {
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  });

  const response = programEnrollments.map((enrollment) => {
    return {
      ...enrollment,
      rewards: includeRewardsDiscounts
        ? [
            enrollment.clickReward,
            enrollment.leadReward,
            enrollment.saleReward,
            enrollment.referralReward,
            enrollment.customReward,
          ].filter((r): r is Reward => r !== null)
        : [],
      application: enrollment.application
        ? {
            rejectionReason: enrollment.application.rejectionReason,
            rejectionNote: enrollment.application.rejectionNote,
            reviewedAt: enrollment.application.reviewedAt,
          }
        : null,
    };
  });

  return NextResponse.json(
    z.array(PartnerProfileProgramEnrollmentSchema).parse(response),
  );
});
