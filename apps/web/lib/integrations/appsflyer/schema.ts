import * as z from "zod/v4";
import { APPSFLYER_MACRO_VALUES } from "./constants";
import { isValidAppsFlyerMacroTemplate } from "./macro-template";

export const appsFlyerMacroExactValueSchema = z.string().refine(
  (v) => APPSFLYER_MACRO_VALUES.includes(v),
  {
    message: `Value must be one of: ${APPSFLYER_MACRO_VALUES.join(", ")}`,
  },
);

/** Free-form value; every `{{...}}` token must be a known macro. */
export const appsFlyerMacroTemplateValueSchema = z.string().refine(
  (v) => isValidAppsFlyerMacroTemplate(v),
  {
    message: `Invalid macro in value. Use only: ${APPSFLYER_MACRO_VALUES.join(", ")}`,
  },
);

export const appsFlyerRequiredParameterSchema = z.object({
  key: z.string().min(1),
  value: appsFlyerMacroExactValueSchema,
});

export const appsFlyerCustomParameterSchema = z.object({
  key: z.string().min(1),
  value: appsFlyerMacroTemplateValueSchema,
});

export const appsFlyerSettingsSchema = z.object({
  appIds: z.array(z.string()).default([]),
  requiredParameters: z.array(appsFlyerRequiredParameterSchema).default([
    { key: "c", value: "{{PARTNER_NAME}}" },
    { key: "af_siteid", value: "{{PARTNER_LINK_KEY}}" },
  ]),
  parameters: z.array(appsFlyerCustomParameterSchema).default([]),
});

export type AppsFlyerSettings = z.infer<typeof appsFlyerSettingsSchema>;
