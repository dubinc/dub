const FULL_MASK = "***";
const MIDDLE_MASK = "*****";
const MIN_HIDDEN_CHARS = 4;

// Map of route pattern -> response body fields that should be masked before logging.
export const SENSITIVE_RESPONSE_FIELDS_BY_ROUTE = {
  "/tokens/embed/referrals": ["publicToken"],
} as const;

// Partially masks a sensitive value: shows ~50% of the string at the start and
// ~25% at the end, replacing the middle with a fixed `*****`.
// Short strings and non-strings are fully masked to avoid revealing most of the value.
export function maskSensitiveValue(value: unknown): string {
  if (typeof value !== "string") {
    return FULL_MASK;
  }

  const visibleStart = Math.floor(value.length / 2);
  const visibleEnd = Math.floor(value.length / 4);
  const hidden = value.length - visibleStart - visibleEnd;

  if (hidden < MIN_HIDDEN_CHARS) {
    return FULL_MASK;
  }

  return `${value.slice(0, visibleStart)}${MIDDLE_MASK}${value.slice(-visibleEnd)}`;
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
