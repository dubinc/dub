"use server";

import { redis } from "../upstash";
import { authUserActionClient } from "./safe-action";

export const invalidateReferralCoupon = authUserActionClient.action(
  async ({ ctx }) => {
    const { user } = ctx;
    await redis.set(`referralCoupon:${user.id}`, "expired");
  },
);
