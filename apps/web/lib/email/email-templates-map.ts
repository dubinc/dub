import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";

export const EMAIL_TEMPLATES_MAP = {
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
} as const;
