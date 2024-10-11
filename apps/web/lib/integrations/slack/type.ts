export type SlackCredential = {
  appId: string;
  botUserId: string;
  scope: string;
  accessToken: string;
  tokenType: string;
  authUser: { id: string };
  team: { id: string; name: string };
  incomingWebhook: {
    channel: string;
    channelId: string;
    url: string;
  };
};
