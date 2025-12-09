import BountyApproved from "@dub/email/templates/bounty-approved";
import PartnerBanned from "@dub/email/templates/partner-banned";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import ProgramMarketplaceAnnouncement from "@dub/email/templates/program-marketplace-announcement";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";

export const EMAIL_TEMPLATES_MAP = {
  BountyApproved,
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
  PartnerBanned,
  ProgramPayoutThankYou,
  ProgramMarketplaceAnnouncement,
} as const;
