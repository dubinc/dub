import { currencyFormatter, nFormatter } from "@dub/utils";

export type RewardDisplayConfig = {
  mode: "currency" | "custom";
  suffix: string;
  compact: boolean;
} | null;

export function formatReward(
  amountInCents: number,
  config: RewardDisplayConfig,
): string {
  if (!config || config.mode === "currency") {
    return currencyFormatter(amountInCents);
  }

  const value = amountInCents / 100;
  const formatted = config.compact
    ? nFormatter(value, { full: value < 1000 })
    : value.toLocaleString();

  return `${formatted}${config.suffix}`;
}
