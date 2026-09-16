export type RewardNotificationTarget = "group" | "partner" | "link";
export type RewardNotificationAction = "created" | "updated" | "deleted";

export function shouldNotifyRewardChange({
  action,
  target,
  isDefault = false,
  partnerCount,
}: {
  action: RewardNotificationAction;
  target: RewardNotificationTarget;
  isDefault?: boolean;
  partnerCount?: number;
}): boolean {
  if (target === "partner" || target === "link") {
    return true;
  }

  // Creating a non-default reward never assigns partners automatically.
  if (action === "created" && !isDefault) {
    return false;
  }

  return partnerCount === undefined || partnerCount > 0;
}
