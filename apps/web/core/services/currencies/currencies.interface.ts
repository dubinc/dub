export interface ICurrenciesRes {
  currencies: {
    country_name: string;
    country_2code: string;
    country_3code: string;
    currency_symbol: string;
    currency_name: string;
    currency_code: string;
    symbol_at_start: "TRUE" | "FALSE";
    usd_exchange_rate: number;
    eur_exchange_rate: number;
    currency_card: string;
    currency_paypal: string;
    currency_wallet: string;
  };
}
