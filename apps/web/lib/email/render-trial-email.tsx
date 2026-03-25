import {
  TRIAL_EMAIL_TYPE,
  type TrialEmailType,
} from "@/lib/email/trial-email-schedule";
import Trial3DaysRemainingEmail from "@dub/email/templates/trial-3-days-remaining";
import Trial7DaysRemainingEmail from "@dub/email/templates/trial-7-days-remaining";
import TrialEndsTodayEmail from "@dub/email/templates/trial-ends-today";
import TrialLinksFocusEmail from "@dub/email/templates/trial-links-focus";
import TrialPartnerFocusEmail from "@dub/email/templates/trial-partner-focus";
import TrialSocialProofEmail from "@dub/email/templates/trial-social-proof";
import TrialStartedEmail from "@dub/email/templates/trial-started";

export function renderTrialEmail(
  type: TrialEmailType,
  props: {
    email: string;
    name: string | null;
    unsubscribeUrl: string;
    plan: string;
    workspaceSlug: string;
  },
) {
  switch (type) {
    case TRIAL_EMAIL_TYPE.STARTED:
      return TrialStartedEmail(props);
    case TRIAL_EMAIL_TYPE.LINKS_FOCUS:
      return TrialLinksFocusEmail(props);
    case TRIAL_EMAIL_TYPE.PARTNER_FOCUS:
      return TrialPartnerFocusEmail(props);
    case TRIAL_EMAIL_TYPE.SOCIAL_PROOF:
      return TrialSocialProofEmail(props);
    case TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING:
      return Trial7DaysRemainingEmail(props);
    case TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING:
      return Trial3DaysRemainingEmail(props);
    case TRIAL_EMAIL_TYPE.ENDS_TODAY:
      return TrialEndsTodayEmail(props);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
