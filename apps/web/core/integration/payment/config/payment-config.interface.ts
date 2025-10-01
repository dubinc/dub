export interface ICustomerBody {
  id: string;
  ip?: string;
  iat?: number;
  email?: string;
  toxic?: boolean;
  isPaidUser?: boolean;
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
  | "MIN_PRICE"
  | "PRICE_TRIAL_MONTH_PLAN"
  | "PRICE_MONTH_PLAN"
  | "PRICE_QUARTER_PLAN"
  | "PRICE_QUARTER_PLAN_PREV"
  | "PRICE_YEAR_PLAN"
  | "PRICE_YEAR_PLAN_PREV";

export interface IPaymentPlanPrice {
  paymentPlan: TPaymentPlan;
  user: ICustomerBody | null;
}
