"use server";

import { createWithdrawal } from "@/lib/dots/create-withdrawal";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { dotsPayoutPlatforms } from "@/lib/dots/schemas";
import { FREE_WITHDRAWAL_MINIMUM_BALANCE } from "@dub/utils";
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

    const amountToWithdraw = dotsUser.wallet.withdrawable_amount;

    const response = await createWithdrawal({
      dotsUserId: partner.dotsUserId,
      amount: amountToWithdraw,
      platform,
      // for US-based withdrawals over $1,000, we pay the fee
      payoutFeeParty:
        partner.country === "US" &&
        amountToWithdraw > FREE_WITHDRAWAL_MINIMUM_BALANCE
          ? "platform"
          : "user",
    });

    return response;
  });
