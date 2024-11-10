"use server";

import { createWithdrawal } from "@/lib/dots/create-withdrawal";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { dotsPayoutPlatforms } from "@/lib/dots/schemas";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  partnerId: z.string(),
  platform: dotsPayoutPlatforms,
});

export const createDotsWithdrawalAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { platform } = parsedInput;

    if (!partner.dotsUserId) {
      throw new Error("Partner does not have a Dots user ID");
    }

    const dotsUser = await retrieveDotsUser({
      dotsUserId: partner.dotsUserId,
      partner,
    });
    console.log({ dotsUser });

    const response = await createWithdrawal({
      dotsUserId: partner.dotsUserId,
      amount: dotsUser.wallet.withdrawable_amount,
      platform,
    });

    return response;
  });
