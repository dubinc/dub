"use server";

import { PaymentService } from "core/integration/payment/server";

const paymentService = new PaymentService();

export const checkSubscriptionStatusAuthLess = async (email: string) => {
  return await paymentService.checkClientSubscriptionStatus({
    email,
  });
};
