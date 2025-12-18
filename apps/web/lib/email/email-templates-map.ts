import BountyApproved from "@dub/email/templates/bounty-approved";
import DubPartnerRewind from "@dub/email/templates/dub-partner-rewind";
import PartnerBanned from "@dub/email/templates/partner-banned";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import ProgramMarketplaceAnnouncement from "@dub/email/templates/program-marketplace-announcement";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";
import UnresolvedFraudEventsSummary from "@dub/email/templates/unresolved-fraud-events-summary";

export const EMAIL_TEMPLATES_MAP = {
  BountyApproved,
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
  PartnerBanned,
  ProgramPayoutThankYou,
  UnresolvedFraudEventsSummary,
  // special promo emails
  ProgramMarketplaceAnnouncement,
  DubPartnerRewind,
} as const;
