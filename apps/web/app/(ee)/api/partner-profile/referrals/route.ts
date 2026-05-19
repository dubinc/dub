import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { withPartnerProfile } from "@/lib/auth/partner";
import { triggerWorkflows } from "@/lib/cron/qstash-workflow";
import {
  getNetworkReferralsQuerySchema,
  networkReferralSchema,
} from "@/lib/partner-referrals/schemas";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import {
  NETWORK_PROGRAM_DEFAULT_GROUP_ID,
  NETWORK_PROGRAM_DEFAULT_SALE_REWARD_ID,
  NETWORK_PROGRAM_ID,
  NETWORK_USER_ID,
} from "@dub/utils/src/constants/main";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/referrals
export const GET = withPartnerProfile(async ({ partner, searchParams }) => {
  if (!["approved", "trusted"].includes(partner.networkStatus)) {
    throw new DubApiError({
      code: "forbidden",
      message:
        "You must be approved in the Dub Partner Network to view referrals.",
    });
  }

  waitUntil(
    prisma.programEnrollment
      .upsert({
        where: {
          partnerId_programId: {
            partnerId: partner.id,
            programId: NETWORK_PROGRAM_ID,
          },
        },
        create: {
          id: createId({ prefix: "pge_" }),
          partnerId: partner.id,
          programId: NETWORK_PROGRAM_ID,
          status: "approved",
          groupId: NETWORK_PROGRAM_DEFAULT_GROUP_ID,
          saleRewardId: NETWORK_PROGRAM_DEFAULT_SALE_REWARD_ID,
        },
        update: {},
      })
      .then(async (res) => {
        console.log("Program enrollment upserted:", res.id);
        // if program enrollment is created in the last 1 min, most likely it's a new partner
        if (res.createdAt > new Date(Date.now() - 1 * 60 * 1000)) {
          console.log(
            "Program enrollment created in the last 1 min, most likely it's a new partner",
          );
          await triggerWorkflows({
            workflowId: "partner-approved",
            body: {
              programId: NETWORK_PROGRAM_ID,
              partnerId: partner.id,
              userId: NETWORK_USER_ID,
            },
          });
        }
      }),
  );

  const { page = 1, pageSize } =
    getNetworkReferralsQuerySchema.parse(searchParams);

  const referredPartners = await prisma.partner.findMany({
    where: {
      referredByPartnerId: partner.id,
    },
    select: {
      id: true,
      email: true,
      country: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const commissionsMap = new Map<string, number>();
  const activeProgramsCountMap = new Map<string, number>();

  if (referredPartners.length > 0) {
    const [commissions, programEnrollments] = await Promise.all([
      prisma.commission.groupBy({
        by: ["sourcePartnerId"],
        where: {
          partnerId: partner.id,
          programId: NETWORK_PROGRAM_ID,
          type: CommissionType.referral,
          sourcePartnerId: {
            in: referredPartners.map((p) => p.id),
          },
        },
        _sum: {
          earnings: true,
        },
      }),

      prisma.programEnrollment.groupBy({
        by: ["partnerId"],
        where: {
          partnerId: {
            in: referredPartners.map((p) => p.id),
          },
          programId: {
            not: NETWORK_PROGRAM_ID,
          },
          status: {
            in: ACTIVE_ENROLLMENT_STATUSES,
          },
        },
        _count: true,
      }),
    ]);

    for (const commission of commissions) {
      if (commission.sourcePartnerId) {
        commissionsMap.set(
          commission.sourcePartnerId,
          commission._sum.earnings ?? 0,
        );
      }
    }

    for (const count of programEnrollments) {
      if (count.partnerId) {
        activeProgramsCountMap.set(count.partnerId, count._count);
      }
    }
  }

  const result = referredPartners.map((p) => ({
    id: p.id,
    email: obfuscateCustomerEmail(p.email ?? ""),
    country: p.country,
    createdAt: p.createdAt,
    totalEarnings: commissionsMap.get(p.id) ?? 0,
    activeProgramsCount: activeProgramsCountMap.get(p.id) ?? 0,
  }));

  return NextResponse.json(z.array(networkReferralSchema).parse(result));
});
