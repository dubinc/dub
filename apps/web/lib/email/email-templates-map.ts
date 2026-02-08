import BountyApproved from "@dub/email/templates/bounty-approved";
import ProgramMarketplaceAnnouncement from "@dub/email/templates/broadcasts/program-marketplace-announcement";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import ConnectPlatformsReminder from "@dub/email/templates/connect-platforms-reminder";
import DubPartnerRewind from "@dub/email/templates/dub-partner-rewind";
import PartnerBanned from "@dub/email/templates/partner-banned";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerGroupChanged from "@dub/email/templates/partner-group-changed";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";
import UnresolvedFraudEventsSummary from "@dub/email/templates/unresolved-fraud-events-summary";

export const EMAIL_TEMPLATES_MAP = {
  BountyApproved,
  ConnectPayoutReminder,
  ConnectPlatformsReminder,
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
  PartnerBanned,
  ProgramPayoutThankYou,
  UnresolvedFraudEventsSummary,
  PartnerGroupChanged,

  // special promo emails
  ProgramMarketplaceAnnouncement,
  DubPartnerRewind,
} as const;
