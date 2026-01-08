import { CUTOFF_PERIOD } from "@/lib/partners/cutoff-period";
import {
  eligiblePayoutsQuerySchema,
  PayoutResponseSchema,
} from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { Program, Project } from "@dub/prisma/client";
import * as z from "zod/v4";
import { getEffectivePayoutMode } from "./get-effective-payout-mode";
import { getPayoutEligibilityFilter } from "./payout-eligibility-filter";

interface GetEligiblePayoutsProps
  extends Omit<
    z.infer<typeof eligiblePayoutsQuerySchema>,
    "excludedPayoutIds"
  > {
  excludedPayoutIds?: string[];
  program: Pick<Program, "id" | "name" | "minPayoutAmount" | "payoutMode">;
  workspace: Pick<Project, "plan">;
}

export async function getEligiblePayouts({
  program,
  workspace,
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
    where: {
      ...(selectedPayoutId
        ? { id: selectedPayoutId }
        : excludedPayoutIds && excludedPayoutIds.length > 0
          ? { id: { notIn: excludedPayoutIds } }
          : {}),
      ...getPayoutEligibilityFilter({ program, workspace }),
    },
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
