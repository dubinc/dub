import { ApplicationEventStages } from "../types";
import { APPLICATION_ID_COOKIE_PREFIX } from "./schema";

export function getApplicationEventCookieName(programId: string) {
  return `${APPLICATION_ID_COOKIE_PREFIX}${programId}`;
}

export const STAGE_VALUE_KEY: Record<
  ApplicationEventStages,
  "visits" | "starts" | "submissions" | "approvals"
> = {
  visited: "visits",
  started: "starts",
  submitted: "submissions",
  approved: "approvals",
};

export const MARKETPLACE_REFERRAL_SOURCE = "marketplace";

export const isMarketplaceReferralSource = (
  referralSource: string | null | undefined,
) => referralSource === MARKETPLACE_REFERRAL_SOURCE;

export const getApplicationSourceLabelTooltip = (
  referralSource: string | null | undefined,
) => {
  if (!referralSource)
    return {
      label: null,
      tooltip: null,
    };
  if (isMarketplaceReferralSource(referralSource))
    return {
      label: "Dub Marketplace",
      tooltip:
        "This application came from your [Dub Program Marketplace](https://partners.dub.co/marketplace) listing",
    };
  return {
    label: "Public application form",
    tooltip:
      "This application came from your [public application form](https://app.dub.co/program/groups/default/branding?tab=application)",
  };
};

export const getReferralSourceDisplayValue = (referralSource: string) => {
  if (referralSource === MARKETPLACE_REFERRAL_SOURCE)
    return "Dub Program Marketplace";
  if (referralSource === "direct") return "Direct application";
  if (referralSource === "manual") return "Manual attribution";
  return referralSource;
};
