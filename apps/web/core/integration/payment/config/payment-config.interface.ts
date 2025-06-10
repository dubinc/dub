export interface ICustomerBody {
  id: string;
  ip?: string;
  iat?: number;
  locale: string;
  email?: string;
  username?: string;
  isPromoVersion?: boolean;
  emailMarketing?: boolean;
  userToken?: string;
  toxic?: boolean;
  currency?: {
    countryCode?: string;
    currencyCode?: string;
    currencyForPay?: string;
    currencyCard?: string;
    currencyPaypal?: string;
    currencyWallet?: string;
    currencySymbol?: string;
    symbolAtStart?: "TRUE" | "FALSE";
    usdExchangeRate?: number;
    eurExchangeRate?: number;
  };
  paymentInfo?: {
    customerId?: string;
    clientToken?: string;
    subscriptionId?: string;
    subscriptionPlanCode?: Partial<TPaymentPlan>;
    paymentType?: string;
    paymentMethodType?: string;
    paymentProcessor?: string;
    paymentMethodToken?: string;
    clientTokenExpirationDate?: string;
    nationalDocumentId?: string;
  };
  sessions?: { [key: string]: string | number | boolean | undefined };
}

export enum EPaymentMethod {
  MASTERCARD = "MASTERCARD",
  VISA = "VISA",
  PAYPAL = "PAYPAL",
}
export type TPaymentPlan =
  | "PRICE_QUARTER"
  | "PRICE_QUARTER_PREV"
  | "PRICE_HALF_YEAR"
  | "PRICE_HALF_YEAR_PREV"
  | "PRICE_YEAR"
  | "PRICE_YEAR_PREV";

export interface IPaymentPlanPrice {
  paymentPlan: TPaymentPlan;
  user: ICustomerBody | null;
}
