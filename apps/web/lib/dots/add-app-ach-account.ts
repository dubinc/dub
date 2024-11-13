import z from "../zod";
import { dotsFetch } from "./fetch";

const schema = z.object({
  name: z.string(),
  mask: z.string(),
});

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
  const response = await dotsFetch(`/apps/${dotsAppId}/ach-account`, {
    method: "PUT",
    body: {
      account_number: accountNumber,
      routing_number: routingNumber,
      account_type: accountType,
    },
  });

  return schema.parse(response);
};
