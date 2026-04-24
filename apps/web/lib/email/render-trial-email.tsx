import {
  TRIAL_EMAIL_TYPE,
  type TrialEmailType,
} from "@/lib/email/trial-email-schedule";
import Trial3DaysRemainingEmail from "@dub/email/templates/trial/trial-3-days-remaining";
import Trial7DaysRemainingEmail from "@dub/email/templates/trial/trial-7-days-remaining";

export function renderTrialEmail(
  type: TrialEmailType,
  props: {
    email: string;
    name: string | null;
    plan: string;
    workspaceSlug: string;
  },
) {
  switch (type) {
    case TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING:
      return Trial7DaysRemainingEmail(props);
    case TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING:
      return Trial3DaysRemainingEmail(props);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
