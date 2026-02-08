import { isZeroDecimalCurrency } from "@dub/utils";
import { redis } from "../upstash/redis";

export const convertCurrency = async ({
  currency,
  amount,
}: {
  currency: string;
  amount: number;
}) => {
  const currencyCode = currency.toUpperCase();
  const fxRate = await redis.hget("fxRates:usd", currencyCode); // e.g. for MYR it'll be around 4.4

  // if the FX rate is not found, we return the original amount
  if (!fxRate) {
    return {
      currency,
      amount,
    };
  }

  // convert amount to USD based on the current FX rate
  let convertedAmount = amount / Number(fxRate);

  // if the currency is a zero decimal currency, we need to multiply the converted amount by 100
  if (isZeroDecimalCurrency(currencyCode)) {
    convertedAmount = convertedAmount * 100;
  }

  return {
    currency: "usd",
    // round the final converted amount to 0 decimal places (USD in cents)
    amount: Math.round(convertedAmount),
  };
};

export const convertCurrencyWithFxRates = ({
  currency,
  amount,
  fxRates,
}: {
  currency: string;
  amount: number;
  fxRates: Record<string, string>;
}) => {
  const currencyCode = currency.toUpperCase();
  const fxRate = fxRates[currencyCode];

  // if the FX rate is not found, we return the original amount
  if (!fxRate) {
    return {
      currency,
      amount,
    };
  }

  // convert amount to USD based on the current FX rate
  let convertedAmount = amount / Number(fxRate);

  // if the currency is a zero decimal currency, we need to multiply the converted amount by 100
  if (isZeroDecimalCurrency(currencyCode)) {
    convertedAmount = convertedAmount * 100;
  }

  return {
    currency: "usd",
    // round the final converted amount to 0 decimal places (USD in cents)
    amount: Math.round(convertedAmount),
  };
};
