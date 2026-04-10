import { Prisma } from "@dub/prisma/client";

/** Narrow payouts by explicit selection or by exclusions (mutually exclusive). */
export function payoutIdSelectionWhere({
  selectedPayoutIds,
  excludedPayoutIds,
}: {
  selectedPayoutIds?: string[] | undefined;
  excludedPayoutIds?: string[] | undefined;
}): Prisma.PayoutWhereInput {
  if (selectedPayoutIds && selectedPayoutIds.length > 0) {
    return { id: { in: selectedPayoutIds } };
  }
  if (excludedPayoutIds && excludedPayoutIds.length > 0) {
    return { id: { notIn: excludedPayoutIds } };
  }
  return {};
}
