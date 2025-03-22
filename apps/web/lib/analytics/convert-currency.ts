import { redis } from "../upstash/redis";

export const convertCurrency = async ({
  currency,
  amount,
}: {
  currency: string;
  amount: number;
}) => {
  const fxRates = await redis.hget("fxRates:usd", currency.toUpperCase()); // e.g. for MYR it'll be around 4.4

  if (fxRates) {
    return {
      currency: "usd",
      // convert amount to USD (in cents) based on the current FX rate
      // round it to 0 decimal places
      amount: Math.round(amount / Number(fxRates)),
    };
  }

  return {
    currency,
    amount,
  };
};
