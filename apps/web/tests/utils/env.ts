import { z } from "zod";

export const integrationTestEnv = z.object({
  E2E_BASE_URL: z.string().url().min(1),
  E2E_TOKEN: z.string().min(1),
  E2E_TOKEN_OLD: z.string().min(1),
  E2E_USER_ID: z.string().min(1),
  E2E_USER_ID_OLD: z.string().min(1),
  E2E_WORKSPACE_ID: z.string().min(1),
  CI: z.coerce
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export const env = integrationTestEnv.parse(process.env);
