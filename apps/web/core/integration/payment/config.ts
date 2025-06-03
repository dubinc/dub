export type TPaymentPlan = "ANNUAL" | "SEMESTER" | "QUARTERLY";

export interface ICustomerBody {
  id: string;
  email: string;
  paymentInfo?: {
    clientToken: string;
    paymentMethodType?: string;
  };
  currency?: {
    currencyCard?: string;
    currencyPaypal?: string;
    currencyWallet?: string;
    countryCode?: string;
    currencyForPay?: string;
  };
}

export interface PaymentPlanConfig {
  ANNUAL: number;
  SEMESTER: number;
  QUARTERLY: number;
}

const DEFAULT_PLAN_PRICES: PaymentPlanConfig = {
  ANNUAL: 1999,
  SEMESTER: 2999,
  QUARTERLY: 3999,
};

export function getPaymentPlanPrice({
  paymentPlan,
}: {
  paymentPlan: TPaymentPlan;
  user: ICustomerBody;
}): { priceForPay: number } {
  const basePrice = DEFAULT_PLAN_PRICES[paymentPlan];

  return {
    priceForPay: basePrice,
  };
}
