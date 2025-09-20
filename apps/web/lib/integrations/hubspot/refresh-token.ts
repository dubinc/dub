import { prisma } from "@dub/prisma";
import {
  HUBSPOT_API_HOST,
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
} from "./constants";
import { hubSpotAuthTokenSchema } from "./schema";
import { HubSpotAuthToken } from "./types";

export async function refreshAccessToken({
  installationId,
  authToken,
}: {
  installationId: string;
  authToken: HubSpotAuthToken;
}) {
  if (isTokenValid(authToken)) {
    return authToken;
  }

  try {
    const response = await fetch(`${HUBSPOT_API_HOST}/oauth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: authToken.refresh_token,
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(result);
      throw new Error(result.message);
    }

    // Store the new auth token
    const newAuthToken = hubSpotAuthTokenSchema.parse({
      ...result,
      created_at: Date.now(),
    });

    await prisma.installedIntegration.update({
      where: {
        id: installationId,
      },
      data: {
        credentials: newAuthToken,
      },
    });

    return newAuthToken;
  } catch (error) {
    console.error(
      "[HubSpot] Error refreshing the access token:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

function isTokenValid(authToken: HubSpotAuthToken) {
  const buffer = 60 * 1000; // refresh 1 min early
  const expiresAt = authToken.created_at + authToken.expires_in * 1000;

  return Date.now() < expiresAt - buffer;
}
