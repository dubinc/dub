import { z } from "zod";

export const integrationTestEnv = z.object({
  API_BASE_URL: z.string().url().default("https://api.dub.co"),
  TOKEN: z.string().min(1),
  USER_ID: z.string().min(1),
  WORKSPACE_ID: z.string().min(1).default("ws_clv6iazq2003k8lh32eclix8l"),
  WORKSPACE_SLUG: z.string().min(1).default("acme"),
  WORKSPACE_NAME: z.string().min(1).default("Acme"),
});
