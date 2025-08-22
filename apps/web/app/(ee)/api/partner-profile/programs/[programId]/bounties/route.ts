import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { BountyWithPartnerDataSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/[programId]/bounties – get available bounties for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { program, totalCommissions } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const [bounties, linkMetrics] = await Promise.all([
    prisma.bounty.findMany({
      where: {
        programId: program.id,
        startsAt: {
          lte: new Date(),
        },
        OR: [
          {
            endsAt: null,
          },
          {
            endsAt: {
              gt: new Date(),
            },
          },
        ],
      },
      include: {
        submissions: {
          where: {
            partnerId: partner.id,
          },
        },
        workflow: true,
      },
    }),
    prisma.link.aggregate({
      _sum: {
        leads: true,
        conversions: true,
        saleAmount: true,
      },
      where: {
        programId: program.id,
        partnerId: partner.id,
      },
    }),
  ]);

  return NextResponse.json(
    z.array(BountyWithPartnerDataSchema).parse(
      bounties.map((bounty) => {
        const triggerConditions = Array.isArray(
          bounty.workflow?.triggerConditions,
        )
          ? bounty.workflow?.triggerConditions
          : [];

        return {
          ...bounty,
          performanceCondition:
            triggerConditions.length > 0 ? triggerConditions[0] : null,

          partner: {
            leads: linkMetrics._sum.leads ?? 0,
            conversions: linkMetrics._sum.conversions ?? 0,
            saleAmount: linkMetrics._sum.saleAmount ?? 0,
            totalCommissions,
          },
        };
      }),
    ),
  );
});
