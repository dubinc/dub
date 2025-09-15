import { redis } from "@/lib/upstash";
import { nanoid } from "@dub/utils";
import {
  HUBSPOT_APP_SCOPES,
  HUBSPOT_CLIENT_ID,
  HUBSPOT_REDIRECT_URI,
  HUBSPOT_STATE_CACHE_PREFIX,
} from "./constants";

// Get the installation URL for HubSpot
export const getHubSpotInstallationUrl = async (workspaceId: string) => {
  const state = nanoid(16);

  const params = new URLSearchParams({
    client_id: HUBSPOT_CLIENT_ID,
    scope: HUBSPOT_APP_SCOPES.join(" "),
    redirect_uri: HUBSPOT_REDIRECT_URI,
    state,
  });

  await redis.set(`${HUBSPOT_STATE_CACHE_PREFIX}:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
};
