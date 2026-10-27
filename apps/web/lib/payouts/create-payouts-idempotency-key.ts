import { createHash } from "crypto";

interface CreatePayoutsIdempotencyKeyParams {
  partnerId: string;
  invoiceId: string | null | undefined;
  payoutIds: string[];
}

// Create deterministic idempotency key for payouts
export function createPayoutsIdempotencyKey({
  partnerId,
  invoiceId,
  payoutIds,
}: CreatePayoutsIdempotencyKeyParams): string {
  if (invoiceId) {
    return `payouts-${invoiceId}-${partnerId}`;
  }

  const sortedPayoutIds = [...payoutIds].sort((a, b) => a.localeCompare(b));

  const hash = createHash("sha256")
    .update(sortedPayoutIds.join(","))
    .digest("hex")
    .slice(0, 32);

  return `payouts-${partnerId}-${hash}`;
}
