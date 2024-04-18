import { z } from "zod";

export const integrationTestEnv = z.object({
  API_BASE_URL: z.string().url().default("http://api.localhost:8888"),
  TOKEN: z.string().min(1),
  // WORKSPACE_ID: z.string().min(1),
  // WORKSPACE_SLUG: z.string().min(1),
  USER_ID: z.string().min(1),
});