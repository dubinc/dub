const FULL_MASK = "***";
const MIDDLE_MASK = "*****";
const MIN_HIDDEN_CHARS = 4;
const LAST_VISIBLE_CHARS = 6;

// Map of route pattern -> response body fields that should be masked before logging.
export const SENSITIVE_RESPONSE_FIELDS_BY_ROUTE = {
  "/tokens/embed/referrals": ["publicToken"],
} as const;

// Stripe-style partial mask: visible prefix through the last `_` (e.g. `sk_live_`),
// a fixed middle mask, and the last 6 characters (e.g. `sk_live_*****xyz123`).
// Values without enough characters between prefix and suffix fully mask.
export function maskSensitiveValue(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return FULL_MASK;
  }

  const suffixLen = Math.min(LAST_VISIBLE_CHARS, value.length);
  const suffixStart = value.length - suffixLen;

  const lastUnderscore = value.lastIndexOf("_");
  const prefixEnd = lastUnderscore >= 0 ? lastUnderscore + 1 : 0;

  if (prefixEnd > suffixStart) {
    return FULL_MASK;
  }

  if (suffixStart - prefixEnd < MIN_HIDDEN_CHARS) {
    return FULL_MASK;
  }

  const prefix = value.slice(0, prefixEnd);
  const suffix = value.slice(suffixStart);

  return `${prefix}${MIDDLE_MASK}${suffix}`;
}

// Recursively mask the given keys in an object/array. Returns a new value and
// does not mutate the input. Non-object values are returned as-is.
export function maskSensitiveFields<T>({
  body,
  keys,
}: {
  body: T;
  keys: string[];
}): T {
  if (!body || keys.length === 0) {
    return body;
  }

  const keySet = new Set(keys);

  const mask = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(mask);
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = keySet.has(k) ? maskSensitiveValue(v) : mask(v);
      }
      return result;
    }

    return value;
  };

  return mask(body) as T;
}
