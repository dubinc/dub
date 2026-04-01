import { DUB_API_HOST } from "./constants";
import { StripeMode, Token } from "./types";

// Update the workspace with stripeAccountId
export async function updateWorkspace({
  token,
  accountId,
  stripeMode,
}: {
  token: Token;
  accountId: string | null;
  stripeMode: StripeMode;
}) {
  const response = await fetch(`${DUB_API_HOST}/stripe/integration`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    body: JSON.stringify({
      stripeAccountId: accountId,
      stripeMode,
    }),
  });

  if (!response.ok) {
    const data = await response.json();

    throw new Error("Failed to update workspace.", {
      cause: data.error,
    });
  }
}
