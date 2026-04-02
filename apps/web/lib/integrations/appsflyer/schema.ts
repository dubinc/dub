import * as z from "zod/v4";

export const appsFlyerParameterSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const appsFlyerSettingsSchema = z.object({
  appIds: z.array(z.string()).default([]),
  requiredParameters: z.array(appsFlyerParameterSchema).default([
    { key: "c", value: "{{PARTNER_NAME}}" },
    { key: "af_siteid", value: "{{PARTNER_LINK_KEY}}" },
  ]),
  parameters: z.array(appsFlyerParameterSchema).default([]),
});

export type AppsFlyerSettings = z.infer<typeof appsFlyerSettingsSchema>;
