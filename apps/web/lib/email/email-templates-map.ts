import BountyApproved from "@dub/email/templates/bounty-approved";
import IdentityVerificationAnnouncement from "@dub/email/templates/broadcasts/identity-verification-announcement";
import StablecoinPayoutsAnnouncement from "@dub/email/templates/broadcasts/stablecoin-payouts-announcement";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import ConnectPlatformsReminder from "@dub/email/templates/connect-platforms-reminder";
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

  // special broadcast emails
  // DubPartnerRewind,
  // DubProductUpdateMar26,
  IdentityVerificationAnnouncement,
  // PayoutAutoWithdrawals,
  // ProgramMarketplaceAnnouncement,
  StablecoinPayoutsAnnouncement,
} as const;
