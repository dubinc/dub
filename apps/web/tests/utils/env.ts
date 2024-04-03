import { z } from "zod";

export const integrationTestEnv = z.object({
  API_BASE_URL: z.string().url().default("http://api.localhost:8888"),
});
