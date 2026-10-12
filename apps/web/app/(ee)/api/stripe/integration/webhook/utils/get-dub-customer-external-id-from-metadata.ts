/**
 * Resolve Dub customer.externalId from Stripe object metadata.
 * Precedence:
 * 1. dubCustomerExternalId
 * 2. dubCustomerId
 * 3. user_id (Lemon Squeezy customer id after LS → Stripe migration)
 */
export function getDubCustomerExternalIdFromMetadata(
  metadata?: Record<string, string> | null,
): string | undefined {
  if (!metadata) return undefined;

  const value =
    metadata.dubCustomerExternalId ||
    metadata.dubCustomerId ||
    metadata.user_id;

  if (value == null || value === "") return undefined;

  return String(value);
}
