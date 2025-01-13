import { DUB_HOST } from "./constants";
import { Token } from "./types";

// Update the workspace with stripeAccountId
export async function updateWorkspace({
  token,
  workspaceId,
  accountId,
}: {
  token: Token;
  workspaceId: string;
  accountId: string | null;
}) {
  const response = await fetch(
    `${DUB_HOST}/api/stripe/integration?workspaceId=${workspaceId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({
        stripeAccountId: accountId,
      }),
    },
  );

  if (!response.ok) {
    const data = await response.json();

    throw new Error("Failed to update workspace.", {
      cause: data.error,
    });
  }
}