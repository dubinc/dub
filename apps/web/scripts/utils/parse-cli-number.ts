const DIGITS_ONLY = /^\d+$/;

/**
 * Parses a CLI flag value as an integer of at least `minimum`.
 *
 * The digits-only check has to run before `Number()`, which on its own would
 * silently accept hex (`0x10` → 16), scientific notation (`1e9` → 1000000000),
 * decimals (`5.0` → 5), signs (`+5` → 5), and surrounding whitespace. A flag
 * like `--count=1e9` should be a typo the operator hears about, not a billion
 * rows. `Number.isSafeInteger` then rejects digit strings past 2^53 - 1, which
 * cannot round-trip.
 */
function parseInteger(
  value: string | undefined,
  flag: string,
  minimum: number,
  expected: string,
) {
  const parsed =
    value !== undefined && DIGITS_ONLY.test(value) ? Number(value) : NaN;

  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(
      `${flag} must be ${expected}, received: ${
        value === undefined ? "(missing)" : `"${value}"`
      }`,
    );
  }

  return parsed;
}

export function parsePositiveInteger(value: string | undefined, flag: string) {
  return parseInteger(value, flag, 1, "a positive integer");
}

/** For flags where zero is meaningful, such as disabling benchmark warm-up. */
export function parseNonNegativeInteger(
  value: string | undefined,
  flag: string,
) {
  return parseInteger(value, flag, 0, "a non-negative integer");
}
