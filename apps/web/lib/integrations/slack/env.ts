import z from "@/lib/zod";

export const envSchema = z.object({
  SLACK_APP_INSTALL_URL: z.string(),
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
});

export const getSlackEnv = () => {
  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new Error(
      "Slack app environment variables are not configured properly.",
    );
  }

  return env.data;
};
