import { CUTOFF_PERIOD } from "@/lib/partners/cutoff-period";
import {
  eligiblePayoutsQuerySchema,
  PayoutResponseSchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { Program } from "@dub/prisma/client";
import { z } from "zod";
import { getEffectivePayoutMode } from "./get-effective-payout-mode";
import { getPayoutEligibilityFilter } from "./payout-eligibility-filter";

interface GetEligiblePayoutsProps
  extends z.infer<typeof eligiblePayoutsQuerySchema> {
  excludedPayoutIds?: string[];
  program: Pick<Program, "id" | "name" | "minPayoutAmount" | "payoutMode">;
}

const getEligiblePayoutsWhere = ({
  program,
  cutoffPeriod,
  selectedPayoutId,
  excludedPayoutIds,
}: Pick<
  GetEligiblePayoutsProps,
  "program" | "cutoffPeriod" | "selectedPayoutId" | "excludedPayoutIds"
>) => {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  return {
    ...(selectedPayoutId
      ? { id: selectedPayoutId }
      : excludedPayoutIds && excludedPayoutIds.length > 0
        ? { id: { notIn: excludedPayoutIds } }
        : {}),
    ...getPayoutEligibilityFilter(program),
    ...(cutoffPeriodValue && {
      OR: [
        {
          periodStart: null,
          periodEnd: null,
        },
        {
          periodEnd: {
            lte: cutoffPeriodValue,
          },
        },
      ],
    }),
  };
};

export async function getEligiblePayouts({
  program,
  cutoffPeriod,
  selectedPayoutId,
  excludedPayoutIds,
  pageSize,
  page,
}: GetEligiblePayoutsProps) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  let payouts = await prisma.payout.findMany({
    where: getEligiblePayoutsWhere({
      program,
      cutoffPeriod,
      selectedPayoutId,
      excludedPayoutIds,
    }),
    include: {
      partner: {
        include: {
          programs: {
            where: {
              programId: program.id,
            },
            select: {
              tenantId: true,
            },
          },
        },
      },
      ...(cutoffPeriodValue && {
        commissions: {
          where: {
            createdAt: {
              lt: cutoffPeriodValue,
            },
          },
        },
      }),
    },
    orderBy: {
      amount: "desc",
    },
    ...(isFinite(pageSize) && {
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  });

  if (cutoffPeriodValue) {
    payouts = payouts
      .map((payout) => {
        // custom payouts are included by default
        if (!payout.periodStart && !payout.periodEnd) {
          return payout;
        }

        const newPayoutAmount = payout.commissions.reduce((acc, commission) => {
          return acc + commission.earnings;
        }, 0);

        return {
          ...payout,
          amount: newPayoutAmount,
        };
      })
      .filter((payout) => payout.amount >= program.minPayoutAmount);
  }

  const eligiblePayouts = payouts.map(({ partner, ...payout }) => ({
    ...payout,
    partner: {
      ...partner,
      ...partner.programs[0],
    },
    mode: getEffectivePayoutMode({
      payoutMode: program.payoutMode,
      payoutsEnabledAt: partner.payoutsEnabledAt,
    }),
  }));

  return z.array(PayoutResponseSchema).parse(eligiblePayouts);
}

export async function getEligiblePayoutsCount({
  program,
  cutoffPeriod,
  selectedPayoutId,
  excludedPayoutIds,
}: Omit<GetEligiblePayoutsProps, "pageSize" | "page">) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  // Requires special re-computing and filtering of payouts, so we just have to fetch all of them
  if (cutoffPeriodValue)
    return (
      await getEligiblePayouts({
        program,
        cutoffPeriod,
        selectedPayoutId,
        excludedPayoutIds,
        pageSize: Infinity,
        page: 1,
      })
    ).length;

  // Simple count
  return await prisma.payout.count({
    where: getEligiblePayoutsWhere({
      program,
      cutoffPeriod,
      selectedPayoutId,
      excludedPayoutIds,
    }),
  });
}
