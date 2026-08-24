import * as z from "zod/v4";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 255;

// Printable ASCII excluding whitespace and control characters (Stripe-style).
export const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7E]+$/;

export const idempotencyKeyHeaderSchema = z
  .string()
  .max(
    IDEMPOTENCY_KEY_MAX_LENGTH,
    `Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
  )
  .regex(
    IDEMPOTENCY_KEY_PATTERN,
    "Idempotency-Key must contain only printable ASCII characters (no whitespace or control characters).",
  )
  .optional()
  .meta({
    description:
      "Optional idempotency key (max 255 printable ASCII characters, no whitespace). When set, takes precedence over `invoiceId` for deduplication.",
  });
