import z from "@/lib/zod";

export const envSchema = z.object({
  SLACK_APP_INSTALL_URL: z.string(),
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_SIGNING_SECRET: z.string(),
});

type SlackEnv = z.infer<typeof envSchema>;

let env: SlackEnv | undefined;

export const getSlackEnv = () => {
  if (env) {
    return env;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      "Slack app environment variables are not configured properly.",
    );
  }

  env = parsed.data;

  return env;
};
