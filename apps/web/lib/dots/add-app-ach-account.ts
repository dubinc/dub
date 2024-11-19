import { dotsFetch } from "./fetch";

export const addAppAchAccount = async ({
  dotsAppId,
  accountNumber,
  routingNumber,
  accountType,
}: {
  dotsAppId: string;
  accountNumber: string;
  routingNumber: string;
  accountType: "checking" | "savings";
}) => {
  return await dotsFetch(`/apps/${dotsAppId}/ach-account`, {
    method: "PUT",
    body: {
      account_number: accountNumber,
      routing_number: routingNumber,
      account_type: accountType,
    },
  });
};
