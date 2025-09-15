import z from "@/lib/zod";

export const hubSpotAuthTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scopes: z.array(z.string()),
  expires_in: z.number(),
  hub_id: z.number(),
});
