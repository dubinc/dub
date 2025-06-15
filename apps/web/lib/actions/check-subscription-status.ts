'use server';

import { PaymentService } from 'core/integration/payment/server';

const paymentService = new PaymentService();

export async function checkSubscriptionStatus(email: string) {
  return await paymentService.checkClientSubscriptionStatus({
    email,
  });
}
