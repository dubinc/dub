import { DubApiError } from "@/lib/api/errors";
import {
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_PATTERN,
} from "@/lib/zod/schemas/idempotency";

export function resolveIdempotencyKey({
  headerKey,
  invoiceId,
}: {
  headerKey?: string | null;
  invoiceId?: string | null;
}): string | null {
  const fromHeader = headerKey?.trim();
  if (fromHeader) {
    if (
      fromHeader.length > IDEMPOTENCY_KEY_MAX_LENGTH ||
      !IDEMPOTENCY_KEY_PATTERN.test(fromHeader)
    ) {
      throw new DubApiError({
        code: "bad_request",
        message:
          fromHeader.length > IDEMPOTENCY_KEY_MAX_LENGTH
            ? `Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`
            : "Idempotency-Key must contain only printable ASCII characters (no whitespace or control characters).",
      });
    }

    return fromHeader;
  }

  // invoiceId fallback is not subject to header charset/length rules
  const fromInvoiceId = invoiceId?.trim();
  if (fromInvoiceId) {
    return fromInvoiceId;
  }

  return null;
}
