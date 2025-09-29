import { ICustomerBody } from "core/integration/payment/config";
import ky from "ky";
import { ICurrenciesRes } from "./currencies.interface";

export const getCurrenciesData = async (): Promise<
  ICustomerBody["currency"]
> => {
  const res = await ky.get<ICurrenciesRes>(
    process.env.NEXT_PUBLIC_CURRENCY_URL as string,
  );
  const { currencies } = await res.json();

  const toFloat = (
    value: string | number | undefined,
    fallback = 1,
  ): number => {
    if (value == null) return fallback;
    const cleaned = String(value).replace(/,/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  };

  return {
    countryCode: currencies.country_2code || "US",
    currencyCode: currencies.currency_code || "USD",
    currencyForPay: currencies.currency_card || "USD",
    currencyCard: currencies.currency_card || "USD",
    currencyPaypal: currencies.currency_paypal || "USD",
    currencyWallet: currencies.currency_wallet || "USD",
    currencySymbol: currencies.currency_symbol || "$",
    symbolAtStart: currencies.symbol_at_start || "TRUE",
    usdExchangeRate: toFloat(currencies.usd_exchange_rate, 1),
    eurExchangeRate: toFloat(currencies.eur_exchange_rate, 1),
  };
};
