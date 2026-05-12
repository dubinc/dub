import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  getNetworkReferralsQuerySchema,
  networkReferralSchema,
} from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { CommissionType } from "@dub/prisma/client";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
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
    prisma.programEnrollment.upsert({
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
      },
      update: {},
    }),
  );

  const {
    country,
    page = 1,
    pageSize,
  } = getNetworkReferralsQuerySchema.parse(searchParams);

  const referredPartners = await prisma.partner.findMany({
    where: {
      referredByPartnerId: partner.id,
      ...(country && { country }),
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

  if (referredPartners.length > 0) {
    const commissions = await prisma.commission.groupBy({
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

  const result = referredPartners.map((p) => ({
    id: p.id,
    email: obfuscateCustomerEmail(p.email ?? ""),
    country: p.country,
    createdAt: p.createdAt,
    earnings: commissionsMap.get(p.id) ?? 0,
  }));

  return NextResponse.json(z.array(networkReferralSchema).parse(result));
});
