import { CUTOFF_PERIOD } from "@/lib/partners/cutoff-period";
import { prisma } from "@/lib/prisma";
import {
  TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
  TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS,
} from "@/lib/tremendous/constants";
import {
  eligiblePayoutsQuerySchema,
  PayoutResponseSchema,
} from "@/lib/zod/schemas/payouts";
import { Program } from "@prisma/client";
import * as z from "zod/v4";
import { getEffectivePayoutMode } from "./get-effective-payout-mode";
import { getPayoutEligibilityFilter } from "./payout-eligibility-filter";
import { payoutIdSelectionWhere } from "./payout-id-selection-where";

interface GetEligiblePayoutsProps
  extends z.output<typeof eligiblePayoutsQuerySchema> {
  program: Pick<Program, "id" | "name" | "minPayoutAmount" | "payoutMode">;
}

export async function getEligiblePayouts({
  program,
  cutoffPeriod,
  selectedPayoutIds,
  excludedPayoutIds,
  pageSize,
  page = 1,
}: GetEligiblePayoutsProps) {
  const cutoffPeriodValue = CUTOFF_PERIOD.find(
    (c) => c.id === cutoffPeriod,
  )?.value;

  let payouts = await prisma.payout.findMany({
    where: {
      ...payoutIdSelectionWhere({ selectedPayoutIds, excludedPayoutIds }),
      ...getPayoutEligibilityFilter({ program }),
    },
    include: {
      partner: true,
      programEnrollment: {
        select: {
          groupId: true,
          tenantId: true,
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
      .filter((payout) => {
        if (payout.amount >= program.minPayoutAmount) {
          if (payout.partner.defaultPayoutMethod === "tremendous") {
            return (
              payout.amount >= TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS &&
              payout.amount <= TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS
            );
          }
          return true;
        }
        return false;
      });
  }

  const eligiblePayouts = payouts.map(
    ({ partner, programEnrollment, ...payout }) => ({
      ...payout,
      traceId: payout.stripePayoutTraceId,
      partner: {
        ...partner,
        ...programEnrollment,
      },
      mode: getEffectivePayoutMode({
        payoutMode: program.payoutMode,
        payoutsEnabledAt: partner.payoutsEnabledAt,
      }),
    }),
  );

  return z.array(PayoutResponseSchema).parse(eligiblePayouts);
}
