import { getEffectivePayoutMode } from "@/lib/api/payouts/get-effective-payout-mode";
import { isProductionEnvironment } from "@/lib/sandbox/environment";
import useProgram from "@/lib/swr/use-program";
import {
  TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
  TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS,
} from "@/lib/tremendous/constants";
import { PayoutResponse, ProgramProps } from "@/lib/types";
import { currencyFormatter } from "@dub/utils";
import {
  PartnerPayoutMethod,
  PayoutMode,
  PayoutStatus,
  ProgramPayoutMode,
} from "@prisma/client";
import { ReactNode, useMemo } from "react";

type BatchConfirmBlocker =
  | "belowMinimum"
  | "notConnected"
  | "giftCardRange"
  | "missingTenantId";

type BatchConfirmEligibility = {
  minPayoutAmount: number;
  programPayoutMode: ProgramPayoutMode;
  environment: ProgramProps["environment"] | undefined;
};

const MIN_GIFT_CARD_PAYOUT_AMOUNT = currencyFormatter(
  TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS,
  {
    trailingZeroDisplay: "stripIfInteger",
  },
);

const MAX_GIFT_CARD_PAYOUT_AMOUNT = currencyFormatter(
  TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS,
  {
    trailingZeroDisplay: "stripIfInteger",
  },
);

// Matches server `getPayoutEligibilityFilter` and in-table warnings in `AmountRowItem`.
function getBatchConfirmBlockers(
  payout: PayoutResponse,
  { minPayoutAmount, programPayoutMode, environment }: BatchConfirmEligibility,
): BatchConfirmBlocker[] {
  const blockers: BatchConfirmBlocker[] = [];

  if (payout.amount < minPayoutAmount) {
    blockers.push("belowMinimum");
  }

  if (
    payout.partner.defaultPayoutMethod === PartnerPayoutMethod.tremendous &&
    (payout.amount < TREMENDOUS_MIN_PAYOUT_AMOUNT_CENTS ||
      payout.amount > TREMENDOUS_MAX_PAYOUT_AMOUNT_CENTS)
  ) {
    blockers.push("giftCardRange");
  }

  // Non-production internal and hybrid payouts are simulated, so a missing
  // payout connection should not block them. External mode still requires a tenant ID.
  if (
    environment != null &&
    !isProductionEnvironment(environment) &&
    programPayoutMode !== ProgramPayoutMode.external
  ) {
    return blockers;
  }

  // Derive effective mode the same way server does
  const effectiveMode = getEffectivePayoutMode({
    payoutMode: programPayoutMode,
    payoutsEnabledAt: payout.partner.payoutsEnabledAt ?? null,
  });

  if (effectiveMode === PayoutMode.external && !payout.partner?.tenantId) {
    blockers.push("missingTenantId");
  }

  if (
    effectiveMode === PayoutMode.internal &&
    !payout.partner?.payoutsEnabledAt
  ) {
    blockers.push("notConnected");
  }

  return blockers;
}

function isPayoutEligibleForBatchConfirm(
  payout: PayoutResponse,
  eligibility: BatchConfirmEligibility,
) {
  if (payout.status !== PayoutStatus.pending) {
    return false;
  }

  return getBatchConfirmBlockers(payout, eligibility).length === 0;
}

const BATCH_CONFIRM_REASONS: {
  id: BatchConfirmBlocker;
  label: ReactNode;
}[] = [
  {
    id: "belowMinimum",
    label: (
      <>
        Below the{" "}
        <a
          href="https://dub.co/help/article/partner-payouts#minimum-payout-amount"
          target="_blank"
          className="cursor-help underline decoration-dotted underline-offset-2"
        >
          minimum payout amount
        </a>
      </>
    ),
  },
  {
    id: "notConnected",
    label: "Partner has not connected payouts",
  },
  {
    id: "missingTenantId",
    label:
      "Partner does not have a tenant ID, which is required for external payouts.",
  },
  {
    id: "giftCardRange",
    label: `Not within the gift card payout amount range of ${MIN_GIFT_CARD_PAYOUT_AMOUNT} – ${MAX_GIFT_CARD_PAYOUT_AMOUNT}`,
  },
];

function BatchConfirmTooltip({
  blockers,
}: {
  blockers: Set<BatchConfirmBlocker>;
}) {
  const reasons = BATCH_CONFIRM_REASONS.filter((reason) =>
    blockers.has(reason.id),
  );

  const items =
    reasons.length > 0
      ? reasons
      : [{ id: "notPending", label: "Payout is not pending" }];

  return (
    <div className="max-w-xs space-y-2 px-4 py-3 text-left text-sm">
      <p>Your selection includes payouts that are ineligible for payment:</p>
      <ul className="list-disc space-y-1 pl-4 marker:text-neutral-500">
        {items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </div>
  );
}

function getBatchConfirm(
  payouts: PayoutResponse[],
  eligibility: BatchConfirmEligibility,
) {
  const eligiblePayouts = payouts.filter((payout) =>
    isPayoutEligibleForBatchConfirm(payout, eligibility),
  );

  const disabled =
    payouts.length > 0 && eligiblePayouts.length !== payouts.length;

  const blockers = new Set(
    payouts.flatMap((payout) =>
      payout.status === PayoutStatus.pending
        ? getBatchConfirmBlockers(payout, eligibility)
        : [],
    ),
  );

  return {
    disabled,
    disabledTooltip: disabled ? (
      <BatchConfirmTooltip blockers={blockers} />
    ) : undefined,
    eligiblePayouts,
  };
}

export function usePayoutBatchConfirm() {
  const { program } = useProgram();

  const eligibility = useMemo<BatchConfirmEligibility>(
    () => ({
      minPayoutAmount: program?.minPayoutAmount ?? 0,
      programPayoutMode: program?.payoutMode ?? ProgramPayoutMode.internal,
      environment: program?.environment,
    }),
    [program?.minPayoutAmount, program?.payoutMode, program?.environment],
  );

  return useMemo(
    () => ({
      getBatchConfirm: (payouts: PayoutResponse[]) =>
        getBatchConfirm(payouts, eligibility),
    }),
    [eligibility],
  );
}
