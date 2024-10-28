import { DOTS_API_URL } from "./env";
import { dotsTransactionsSchema } from "./schemas";
import { dotsHeaders } from "./utils";

export const retrieveTransactions = async ({
  dotsAppId,
}: {
  dotsAppId: string;
}) => {
  const response = await fetch(`${DOTS_API_URL}/transactions`, {
    method: "GET",
    headers: dotsHeaders({ dotsAppId }),
  });

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(
      `Failed to retrieve transactions for Dots app ${dotsAppId}.`,
    );
  }

  return dotsTransactionsSchema.parse(await response.json());
};
