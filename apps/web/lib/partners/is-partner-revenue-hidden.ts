/** Group shape used to decide whether sale dollar amounts are hidden from partners. */
export type PartnerRevenueVisibilityGroup = {
  revenueDataSharingDisabledAt?: Date | string | null;
} | null | undefined;

/** Whether partners in this group should not see sale dollar amounts. */
export function isPartnerRevenueHidden(
  group: PartnerRevenueVisibilityGroup,
): boolean {
  return Boolean(group?.revenueDataSharingDisabledAt);
}
