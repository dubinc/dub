import BountyApproved from "@dub/email/templates/bounty-approved";
import PartnerBanned from "@dub/email/templates/partner-banned";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";

export const EMAIL_TEMPLATES_MAP = {
  BountyApproved,
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
  PartnerBanned,
} as const;
