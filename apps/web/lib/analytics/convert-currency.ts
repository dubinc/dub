import { redis } from "../upstash/redis";

const ZERO_DECIMAL_CURRENCIES = [
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
    // convert amount to USD (in cents) based on the current FX rate and round it to 0 decimal places
    const convertedAmount = Math.round(amount / Number(fxRates));
    return {
      currency: "usd",
      // if the currency is a zero decimal currency, we need to multiply the amount by 100 to convert it to cents
      amount: isZeroDecimalCurrency ? convertedAmount * 100 : convertedAmount,
    };
  }

  return {
    currency,
    amount,
  };
};
