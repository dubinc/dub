import z from "@/lib/zod";

export const envSchema = z.object({
  DOTS_API_URL: z.string().default("https://api.dots.dev/api/v2"),
  DOTS_CLIENT_ID: z.string(),
  DOTS_API_KEY: z.string(),
});

let env: z.infer<typeof envSchema> | undefined;

export const getDotsEnv = () => {
  if (env) {
    return env;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error("Dots environment variables are not configured properly.");
  }

  env = parsed.data;

  return env;
};
