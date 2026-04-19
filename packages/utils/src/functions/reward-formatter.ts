import { currencyFormatter } from "./currency-formatter";
import { nFormatter } from "./nformatter";

export interface RewardDisplayOptions {
  mode?: "currency" | "custom";
  prefix?: string;
  suffix?: string;
  divisor?: number;
  compact?: boolean;
}

/**
 * Formats a reward amount in cents based on the display options.
 * 
 * @param valueInCents - The reward amount in cents
 * @param options - Display options for formatting
 * @returns Formatted reward string
 */
export const rewardFormatter = (
  valueInCents: number | bigint,
  options?: RewardDisplayOptions,
): string => {
  // Default to currency mode if no options provided
  if (!options || options.mode === "currency") {
    return currencyFormatter(valueInCents);
  }

  // Custom mode
  const cents = typeof valueInCents === "bigint" ? Number(valueInCents) : valueInCents;
  const divisor = options.divisor ?? 100;
  const value = cents / divisor;
  
  // Format the number
  let formattedValue: string;
  
  if (options.compact) {
    // Use compact notation (e.g., 22k instead of 22000)
    formattedValue = nFormatter(value, { digits: 1 });
  } else {
    // Use standard number formatting
    formattedValue = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  }
  
  return `${options.prefix ?? ""}${formattedValue}${options.suffix ?? ""}`;
};
