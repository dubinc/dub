"use server";

import { generateUnsubscribeToken } from "../email/unsubscribe-token";
import { authUserActionClient } from "./safe-action";

// Generate an unsubscribe token for a user
export const generateUnsubscribeTokenAction = authUserActionClient.action(
  async ({ ctx }) => {
    const { user } = ctx;

    const token = generateUnsubscribeToken(user.email);

    return { token };
  },
);
