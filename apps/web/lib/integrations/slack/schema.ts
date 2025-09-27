import z from "@/lib/zod";

export const slackAuthTokenSchema = z.object({
  app_id: z.string(),
  bot_user_id: z.string(),
  scope: z.string(),
  access_token: z.string(),
  token_type: z.string(),
  authed_user: z.object({
    id: z.string(),
  }),
  team: z.object({
    id: z.string(),
    name: z.string(),
  }),
  incoming_webhook: z.object({
    channel: z.string(),
    channel_id: z.string(),
    url: z.string(),
  }),
});

export const slackSlashCommandSchema = z.object({
  api_app_id: z.string(),
  team_id: z.string(),
  user_id: z.string(),
  text: z.string().transform((text) => text.trim().split(" ")),
  command: z.enum(["/shorten"]),
});
