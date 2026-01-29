import BountyApproved from "@dub/email/templates/bounty-approved";
import ProgramMarketplaceAnnouncement from "@dub/email/templates/broadcasts/program-marketplace-announcement";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import DubPartnerRewind from "@dub/email/templates/dub-partner-rewind";
import PartnerBanned from "@dub/email/templates/partner-banned";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import PartnerReferralSubmitted from "@dub/email/templates/partner-referral-submitted";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";
import ReferralStatusUpdate from "@dub/email/templates/referral-status-update";
import UnresolvedFraudEventsSummary from "@dub/email/templates/unresolved-fraud-events-summary";

export const EMAIL_TEMPLATES_MAP = {
  BountyApproved,
  ConnectPayoutReminder,
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
  PartnerBanned,
  PartnerReferralSubmitted,
  ProgramPayoutThankYou,
  ReferralStatusUpdate,
  UnresolvedFraudEventsSummary,
  // special promo emails
  ProgramMarketplaceAnnouncement,
  DubPartnerRewind,
} as const;
