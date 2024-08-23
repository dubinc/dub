import { WorkspaceProps } from "../types";
import {
  REFERRAL_CLICKS_QUOTA_BONUS,
  REFERRAL_CLICKS_QUOTA_BONUS_MAX,
} from "./constants";

export function getWorkspaceClicksLimit(
  workspace: Pick<WorkspaceProps, "usageLimit" | "referredSignups">,
) {
  return workspace.usageLimit + getReferralClicksQuotaBonus(workspace);
}

export function getReferralClicksQuotaBonus(
  workspace: Pick<WorkspaceProps, "referredSignups">,
) {
  return Math.min(
    workspace.referredSignups * REFERRAL_CLICKS_QUOTA_BONUS,
    REFERRAL_CLICKS_QUOTA_BONUS_MAX,
  );
}
