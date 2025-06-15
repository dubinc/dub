'use server';

import { PaymentService } from 'core/integration/payment/server';
import { authUserActionClient } from './safe-action';
import { checkSubscriptionStatusAuthLess } from './check-subscription-status-auth-less';

const paymentService = new PaymentService();

export const checkSubscriptionStatus = authUserActionClient
  .action(async ({ ctx }) => {
    const { user } = ctx;

    return await checkSubscriptionStatusAuthLess(user.email);
  });
