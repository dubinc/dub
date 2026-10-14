import { nFormatter } from "./nformatter";

// formats a percentage (0 to 100) with up to `digits` decimals, without the % sign
// a value too small to show (for example 0.004 with 2 digits) reads "< 0.01" instead of "0"
export function formatPercentage(
  value: number,
  { digits = 2 }: { digits?: number } = {},
) {
  const smallest = 10 ** -digits;

  return value > 0 && value < smallest
    ? `< ${smallest}`
    : nFormatter(value, { digits });
}
