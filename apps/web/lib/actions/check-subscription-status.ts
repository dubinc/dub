"use server";

import { checkSubscriptionStatusAuthLess } from "./check-subscription-status-auth-less";
import { authUserActionClient } from "./safe-action";

export const checkSubscriptionStatus = authUserActionClient.action(
  async ({ ctx }) => {
    const { user } = ctx;

    return await checkSubscriptionStatusAuthLess(user.email);
  },
);
