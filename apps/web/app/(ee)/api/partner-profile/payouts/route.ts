import { DubApiError } from "@/lib/api/errors";
import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  programScopeFilter,
  resolveScopedProgramQueryToId,
} from "@/lib/auth/partner-users/program-scope-filter";
import { partnerProfilePayoutsQuerySchema } from "@/lib/zod/schemas/partner-profile";
import { PartnerPayoutResponseSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/payouts - get all payouts for a partner
export const GET = withPartnerProfile(
  async ({ partner, searchParams, partnerUser: { assignedProgramIds } }) => {
    const {
      programId,
      status,
      sortBy,
      sortOrder,
      page = 1,
      pageSize,
    } = partnerProfilePayoutsQuerySchema.parse(searchParams);

    const payouts = await prisma.payout.findMany({
      where: {
        partnerId: partner.id,
        ...(programId && { programId }),
        ...(status && { status }),
        ...programScopeFilter(assignedProgramIds),
      },
      include: {
        program: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const transformedPayouts = payouts.map((payout) => {
      const mode =
        payout.mode ??
        getEffectivePayoutMode({
          payoutMode: payout.program.payoutMode,
          payoutsEnabledAt: partner.payoutsEnabledAt,
        });

      return {
        ...payout,
        mode,
        traceId: payout.stripePayoutTraceId,
      };
    });

    return NextResponse.json(
      z.array(PartnerPayoutResponseSchema).parse(transformedPayouts),
    );
  },
  {
    requiredPermission: "payouts.read",
  },
);
