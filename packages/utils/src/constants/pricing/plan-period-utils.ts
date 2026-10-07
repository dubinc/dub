export type PlanPeriod = "monthly" | "yearly";

const YEARLY_USAGE_MULTIPLIER = 12;

export function getPlanLimitForPeriod({
  limit,
  planPeriod = "monthly",
}: {
  limit: number;
  planPeriod?: PlanPeriod;
}) {
  return planPeriod === "yearly" ? limit * YEARLY_USAGE_MULTIPLIER : limit;
}

export function getMonthlyLimitFromPeriod({
  limit,
  planPeriod = "monthly",
}: {
  limit: number;
  planPeriod?: PlanPeriod | string | null;
}) {
  return planPeriod === "yearly" ? limit / YEARLY_USAGE_MULTIPLIER : limit;
}

export function getPlanPeriodSuffix({
  planPeriod = "monthly",
  isUnlimited = false,
}: {
  planPeriod?: PlanPeriod;
  isUnlimited?: boolean;
}) {
  if (isUnlimited) return "";
  return planPeriod === "yearly" ? "/year" : "/month";
}
