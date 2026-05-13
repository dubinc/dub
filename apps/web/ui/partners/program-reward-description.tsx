import { constructDiscountAmount } from "@/lib/api/sales/construct-discount-amount";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import {
  PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS,
  PARTNER_REFERRAL_PERCENTAGE_TRIGGERS,
  PartnerReferralPercentageTrigger,
} from "@/lib/partner-referrals/constants";
import { DiscountProps, RewardProps } from "@/lib/types";
import { referralRewardConfigSchema } from "@/lib/zod/schemas/rewards";
import { cn, currencyFormatter } from "@dub/utils";
import { ProgramRewardModifiersTooltip } from "./program-reward-modifiers-tooltip";

export function ProgramRewardDescription({
  reward,
  discount,
  amountClassName,
  periodClassName,
  showModifiersTooltip = true,
}: {
  reward?: Pick<
    RewardProps,
    | "description"
    | "event"
    | "maxDuration"
    | "modifiers"
    | "tooltipDescription"
    | "type"
    | "amountInCents"
    | "amountInPercentage"
    | "config"
  > | null;
  discount?: DiscountProps | null;
  amountClassName?: string;
  periodClassName?: string;
  showModifiersTooltip?: boolean; // used in server-side reward description construction
}) {
  return (
    <>
      {reward ? (
        <>
          {reward.description ||
            (reward.event === "referral" ? (
              <ReferralRewardDescription
                reward={reward}
                amountClassName={amountClassName}
                periodClassName={periodClassName}
              />
            ) : (
              <>
                Earn{" "}
                <strong
                  className={cn("font-semibold lowercase", amountClassName)}
                >
                  {constructRewardAmount(reward)}{" "}
                </strong>
                {reward.event === "sale" && reward.maxDuration === 0 ? (
                  <>for the first sale</>
                ) : (
                  <>per {reward.event}</>
                )}
                {reward.maxDuration === null ? (
                  <>
                    {" "}
                    for the{" "}
                    <strong className={cn("font-semibold", periodClassName)}>
                      customer's lifetime
                    </strong>
                  </>
                ) : reward.maxDuration && reward.maxDuration > 1 ? (
                  <>
                    {" "}
                    for{" "}
                    <strong className={cn("font-semibold", periodClassName)}>
                      {reward.maxDuration % 12 === 0
                        ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
                        : `${reward.maxDuration} months`}
                    </strong>
                  </>
                ) : null}
              </>
            ))}

          {/* Modifiers */}
          {showModifiersTooltip &&
            (!!reward.modifiers?.length ||
              Boolean(reward.tooltipDescription)) && (
              <>
                {" "}
                <ProgramRewardModifiersTooltip reward={reward} />
              </>
            )}
        </>
      ) : null}

      {discount ? (
        <>
          {" "}
          New users get{" "}
          <strong className={cn("font-semibold", amountClassName)}>
            {constructDiscountAmount(discount)}
          </strong>{" "}
          off{" "}
          {discount.maxDuration === null ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for their lifetime
            </strong>
          ) : discount.maxDuration === 0 ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for their first purchase
            </strong>
          ) : discount.maxDuration === 1 ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for their first month
            </strong>
          ) : discount.maxDuration && discount.maxDuration > 1 ? (
            <strong className={cn("font-semibold", periodClassName)}>
              for {discount.maxDuration} months
            </strong>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function ReferralRewardDescription({
  reward,
  amountClassName,
  periodClassName,
}: {
  reward: Pick<
    RewardProps,
    | "type"
    | "config"
    | "maxDuration"
    | "amountInCents"
    | "amountInPercentage"
    | "modifiers"
  >;
  amountClassName?: string;
  periodClassName?: string;
}) {
  const parsed = referralRewardConfigSchema.safeParse(reward.config);
  const config = parsed.success ? parsed.data : undefined;

  const amountFragment = (
    <>
      Earn{" "}
      <strong className={cn("font-semibold lowercase", amountClassName)}>
        {constructRewardAmount(reward)}{" "}
      </strong>
    </>
  );

  const durationSuffix = () => {
    if (reward.maxDuration === null) {
      return (
        <>
          {" "}
          for the{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            customer's lifetime
          </strong>
        </>
      );
    }

    if (reward.maxDuration === 0) {
      return <> one time</>;
    }

    if (reward.maxDuration && reward.maxDuration > 1) {
      return (
        <>
          {" "}
          for{" "}
          <strong className={cn("font-semibold", periodClassName)}>
            {reward.maxDuration % 12 === 0
              ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
              : `${reward.maxDuration} months`}
          </strong>
        </>
      );
    }

    return null;
  };

  const fallbackReferralDescription = (
    <>
      {amountFragment}
      <>per referral</>
      {durationSuffix()}
    </>
  );

  if (!config) {
    return fallbackReferralDescription;
  }

  if (
    reward.type === "percentage" &&
    (PARTNER_REFERRAL_PERCENTAGE_TRIGGERS as readonly string[]).includes(
      config.trigger,
    )
  ) {
    const basis =
      PARTNER_REFERRAL_PERCENTAGE_BASIS_LABELS[
        config.trigger as PartnerReferralPercentageTrigger
      ];

    return (
      <>
        {amountFragment}
        <>per {basis}</>
        {durationSuffix()}
      </>
    );
  }

  if (
    reward.type === "flat" &&
    config.trigger === "commissionThreshold" &&
    config.commissionsThresholdInCents != null
  ) {
    const threshold = currencyFormatter(config.commissionsThresholdInCents, {
      trailingZeroDisplay: "stripIfInteger",
    });

    return (
      <>
        {amountFragment}
        <>when the referred partner earns at least {threshold} in commissions</>
      </>
    );
  }

  if (reward.type === "flat" && config.trigger === "partnerApproved") {
    return (
      <>
        {amountFragment}
        <>when the referred partner is approved</>
      </>
    );
  }

  return fallbackReferralDescription;
}
