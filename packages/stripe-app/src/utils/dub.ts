import Stripe from "stripe";
import { DUB_HOST } from "./constants";
import { getValidToken } from "./oauth";
import { deleteSecret, getSecret } from "./secrets";
import { Workspace } from "./types";

export async function updateWorkspace({
  stripe,
  workspaceId,
  accountId,
}: {
  stripe: Stripe;
  workspaceId: string;
  accountId: string | null;
}) {
  const token = await getValidToken({ stripe });

  const response = await fetch(
    `${DUB_HOST}/api/stripe/integration/callback?workspaceId=${workspaceId}`,
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

export async function fetchWorkspace({ stripe }: { stripe: Stripe }) {
  const workspace = await getSecret({
    stripe,
    name: "dub_workspace",
  });

  if (!workspace) {
    return null;
  }

  return JSON.parse(workspace) as Workspace;
}

export async function connectWorkspace({
  stripe,
  workspaceId,
  accountId,
}: {
  stripe: Stripe;
  workspaceId: string;
  accountId: string;
}) {
  await updateWorkspace({
    stripe,
    workspaceId,
    accountId,
  });
}

export async function disconnectWorkspace({
  stripe,
  workspaceId,
}: {
  stripe: Stripe;
  workspaceId: string;
}) {
  await updateWorkspace({
    stripe,
    workspaceId,
    accountId: null,
  });

  await Promise.all([
    deleteSecret({
      stripe,
      name: "dub_token",
    }),

    deleteSecret({
      stripe,
      name: "dub_workspace",
    }),
  ]);
}
