import * as z from "zod/v4";

export const appsFlyerSettingsSchema = z.object({
  appIds: z.array(z.string()).default([]),
});

export type AppsFlyerSettings = z.infer<typeof appsFlyerSettingsSchema>;
