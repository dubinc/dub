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

export const getReferralSourceDisplayValue = (referralSource: string) => {
  if (referralSource === "marketplace") return "Dub Program Marketplace";
  if (referralSource === "direct") return "Direct application";
  return referralSource;
};
