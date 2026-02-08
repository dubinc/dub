import * as z from "zod/v4";
import { hubSpotAuthTokenSchema, hubSpotContactSchema } from "./hubspot/schema";

export type HubSpotAuthToken = z.infer<typeof hubSpotAuthTokenSchema>;

export type HubSpotContact = z.infer<typeof hubSpotContactSchema>;

export type SlackAuthToken = {
  appId: string;
  botUserId: string;
  scope: string;
  accessToken: string;
  tokenType: string;
  authUser: {
    id: string;
  };
  team: {
    id: string;
    name: string;
  };
  incomingWebhook: {
    channel: string;
    channelId: string;
  };
};
