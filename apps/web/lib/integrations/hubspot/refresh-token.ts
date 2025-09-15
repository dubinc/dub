import {
  HUBSPOT_API_HOST,
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
  HUBSPOT_REDIRECT_URI,
} from "./constants";
import { hubSpotAuthTokenSchema, hubSpotRefreshTokenSchema } from "./schema";
import { HubSpotAuthToken } from "./types";

export async function refreshAccessToken(
  refreshToken: string,
): Promise<HubSpotAuthToken | null> {
  try {
    const response = await fetch(`${HUBSPOT_API_HOST}/oauth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: HUBSPOT_REDIRECT_URI,
      }),
    });

    const result = hubSpotRefreshTokenSchema.parse(await response.json());

    if (!response.ok) {
      console.error("Failed to refresh HubSpot access token:", result);
      return null;
    }

    console.log(result);

    // Transform the response to match our schema
    const authToken: HubSpotAuthToken = {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      scopes: [], // Scopes are not returned in refresh response, will need to be preserved
      expires_in: result.expires_in,
      hub_id: 0, // Hub ID is not returned in refresh response, will need to be preserved
    };

    return hubSpotAuthTokenSchema.parse(authToken);
  } catch (error) {
    console.error("Error refreshing HubSpot access token:", error);
    return null;
  }
}

/**
 * Refreshes an access token while preserving existing scopes and hub_id
 * @param currentToken - The current HubSpot auth token
 * @returns Updated token with new access_token and refresh_token, or null if refresh failed
 */
export async function refreshAccessTokenWithContext(
  currentToken: HubSpotAuthToken,
): Promise<HubSpotAuthToken | null> {
  const refreshedToken = await refreshAccessToken(currentToken.refresh_token);

  if (!refreshedToken) {
    return null;
  }

  // Preserve the original scopes and hub_id
  return {
    ...refreshedToken,
    scopes: currentToken.scopes,
    hub_id: currentToken.hub_id,
  };
}
