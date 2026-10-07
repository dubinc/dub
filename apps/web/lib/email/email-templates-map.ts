import BountyApproved from "@dub/email/templates/bounty-approved";
import DubProductUpdateSummer26 from "@dub/email/templates/broadcasts/dub-product-update-summer26";
import DubStartupProgramAnnouncement from "@dub/email/templates/broadcasts/dub-startup-program-announcement";
import ConnectPayoutReminder from "@dub/email/templates/connect-payout-reminder";
import ConnectPlatformsReminder from "@dub/email/templates/connect-platforms-reminder";
import PartnerBanned from "@dub/email/templates/partner-banned";
import PartnerDeactivated from "@dub/email/templates/partner-deactivated";
import PartnerGroupChanged from "@dub/email/templates/partner-group-changed";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import PartnerPayoutProcessed from "@dub/email/templates/partner-payout-processed";
import PartnerRewardUpdated from "@dub/email/templates/partner-reward-updated";
import ProgramPayoutThankYou from "@dub/email/templates/program-payout-thank-you";
import UnresolvedRiskEventsSummary from "@dub/email/templates/unresolved-risk-events-summary";
import WorkspaceDisabled from "@dub/email/templates/workspace-disabled";

export const EMAIL_TEMPLATES_MAP = {
  BountyApproved,
  ConnectPayoutReminder,
  ConnectPlatformsReminder,
  PartnerPayoutConfirmed,
  PartnerPayoutProcessed,
  PartnerDeactivated,
  PartnerBanned,
  ProgramPayoutThankYou,
  UnresolvedRiskEventsSummary,
  PartnerGroupChanged,
  PartnerRewardUpdated,
  WorkspaceDisabled,
  // special broadcast emails
  DubStartupProgramAnnouncement,
  DubProductUpdateSummer26,
} as const;
