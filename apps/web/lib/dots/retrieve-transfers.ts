import { dotsFetch } from "./fetch";
import { dotsTransfersSchema } from "./schemas";

export const retrieveTransfers = async ({
  dotsAppId,
  dotsUserId,
  type,
}: {
  dotsAppId?: string;
  dotsUserId?: string;
  type?: "refill" | "balance" | "payout";
}) => {
  const params = new URLSearchParams({
    ...(type ? { type } : {}),
    ...(dotsUserId ? { user_id: dotsUserId } : {}),
  });

  const response = await dotsFetch(
    `/transfers${params.size > 0 ? `?${params.toString()}` : ""}`,
    {
      method: "GET",
      dotsAppId: dotsAppId ?? "default",
    },
  );

  return dotsTransfersSchema.parse(response);
};
