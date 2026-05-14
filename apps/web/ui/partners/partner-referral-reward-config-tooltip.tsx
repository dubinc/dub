import { ReferralRewardConfig } from "@/lib/partner-referrals/types";
import { InfoTooltip } from "@dub/ui";
import { currencyFormatter } from "@dub/utils";

export function PartnerReferralRewardConfigTooltip({
  config,
}: {
  config: ReferralRewardConfig;
}) {
  if (
    !config ||
    !["commissionThreshold", "partnerApproved"].includes(config.trigger)
  ) {
    return null;
  }
  let tooltipText = "";
  if (config.commissionsThresholdInCents) {
    const threshold = currencyFormatter(config.commissionsThresholdInCents, {
      trailingZeroDisplay: "stripIfInteger",
    });
    tooltipText = `Commission is generated when the referred partner receives at least ${threshold} in commissions from the program`;
  } else {
    tooltipText =
      "Commission is generated when the referred partner is approved into the program";
  }
  return <InfoTooltip content={tooltipText} />;
}
