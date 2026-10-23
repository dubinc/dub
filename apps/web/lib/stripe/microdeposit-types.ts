import Stripe from "stripe";

export type MicrodepositType = "amounts" | "descriptor_code";

export type PaymentMethodMicrodeposit = {
  type: MicrodepositType;
  arrivalDate: number | null;
};

export type WorkspacePaymentMethod = Stripe.PaymentMethod & {
  microdeposit: PaymentMethodMicrodeposit | null;
};
