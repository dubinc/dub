const DIGITS_ONLY = /^\d+$/;

/**
 * Parses a CLI flag value as a positive integer.
 *
 * The digits-only check has to run before `Number()`, which on its own would
 * silently accept hex (`0x10` → 16), scientific notation (`1e9` → 1000000000),
 * decimals (`5.0` → 5), signs (`+5` → 5), and surrounding whitespace. A flag
 * like `--count=1e9` should be a typo the operator hears about, not a billion
 * rows. `Number.isSafeInteger` then rejects digit strings past 2^53 - 1, which
 * cannot round-trip.
 */
export function parsePositiveInteger(value: string | undefined, flag: string) {
  const parsed =
    value !== undefined && DIGITS_ONLY.test(value) ? Number(value) : NaN;

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${flag} must be a positive integer, received: ${
        value === undefined ? "(missing)" : `"${value}"`
      }`,
    );
  }

  return parsed;
}
