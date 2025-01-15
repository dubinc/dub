import Stripe from "stripe";
import {
  DUB_API_HOST,
  DUB_CLIENT_ID,
  DUB_HOST,
  STRIPE_MODE,
} from "./constants";
import { getSecret } from "./secrets";
import { Token, Workspace } from "./types";

// Get the redirect URL for the OAuth flow based on the mode
function getRedirectURL() {
  return `https://dashboard.stripe.com/${
    STRIPE_MODE === "test" ? "test/" : ""
  }apps-oauth/dub.co`;
}

// Returns the authorization URL
export function getOAuthUrl({
  state,
  challenge,
}: {
  state: string;
  challenge: string;
}) {
  return `${DUB_HOST}/oauth/authorize?client_id=${DUB_CLIENT_ID}&redirect_uri=${getRedirectURL()}&response_type=code&scope=workspaces.write,links.write&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
}

// Exchanges the authorization code for an access token
export async function getToken({
  code,
  verifier,
}: {
  code: string;
  verifier: string;
}) {
  const url = `${DUB_API_HOST}/oauth/token`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: DUB_CLIENT_ID,
        redirect_uri: getRedirectURL(),
        grant_type: "authorization_code",
        code_verifier: verifier,
        code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error.message);
    }

    return data as Token;
  } catch (e) {
    console.error("Unable to retrieve Dub access token:", (e as Error).message);
  }
}

// Returns the user info from Dub using the access token
export async function getUserInfo({ token }: { token: Token }) {
  const response = await fetch(`${DUB_API_HOST}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error("Failed to fetch user info from Dub.", {
      cause: data.error,
    });
  }

  const { workspace } = data as { workspace: Workspace };

  return workspace;
}

// If the token is expired, it will refresh it
export async function getValidToken({ stripe }: { stripe: Stripe }) {
  const token = await getSecret<Token>({
    stripe,
    name: "dub_token",
  });

  if (!token) {
    throw new Error("Access token not found for the account.");
  }

  try {
    await getUserInfo({ token });
  } catch (e) {
    const refreshedToken = await refreshToken({ token });
    if (!refreshedToken) {
      throw new Error("Failed to refresh access token.");
    }

    return refreshedToken;
  }

  return token;
}

export async function refreshToken({ token }: { token: Token }) {
  const url = `${DUB_API_HOST}/oauth/token`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: DUB_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error.message);
    }

    return data as Token;
  } catch (e) {
    console.error("Unable to refresh Dub access token:", (e as Error).message);
  }
}
