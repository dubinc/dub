import { redis } from "../upstash/redis";

export const ZERO_DECIMAL_CURRENCIES = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

export const convertCurrency = async ({
  currency,
  amount,
}: {
  currency: string;
  amount: number;
}) => {
  const isZeroDecimalCurrency = ZERO_DECIMAL_CURRENCIES.includes(
    currency.toUpperCase(),
  );

  const fxRates = await redis.hget("fxRates:usd", currency.toUpperCase()); // e.g. for MYR it'll be around 4.4

  if (fxRates) {
    // convert amount to USD based on the current FX rate
    let convertedAmount = amount / Number(fxRates);
    // if the currency is a zero decimal currency, we need to multiply the converted amount by 100
    if (isZeroDecimalCurrency) {
      convertedAmount = convertedAmount * 100;
    }

    return {
      currency: "usd",
      // round the final converted amount to 0 decimal places (USD in cents)
      amount: Math.round(convertedAmount),
    };
  }

  return {
    currency,
    amount,
  };
};
