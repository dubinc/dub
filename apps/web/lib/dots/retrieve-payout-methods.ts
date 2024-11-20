import { dotsFetch } from "./fetch";
import { payoutMethodSchema } from "./schemas";

export const retrievePayoutMethods = async (dotsUserId: string) => {
  const payoutMethods = await dotsFetch(`/users/${dotsUserId}/payout-methods`, {
    method: "GET",
    dotsAppId: "default",
  });

  return payoutMethods.map((method) => payoutMethodSchema.parse(method));
};
