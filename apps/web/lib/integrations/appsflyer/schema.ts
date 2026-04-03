import * as z from "zod/v4";
import { APPSFLYER_MACRO_VALUES } from "./constants";

export const appsFlyerMacroValueSchema = z.string().refine(
  (v) => APPSFLYER_MACRO_VALUES.includes(v),
  {
    message: `Value must be one of: ${APPSFLYER_MACRO_VALUES.join(", ")}`,
  },
);

export const appsFlyerParameterSchema = z.object({
  key: z.string().min(1),
  value: appsFlyerMacroValueSchema,
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
