import {
  PARTNER_MACRO_VALUES,
  isValidPartnerMacroTemplate,
} from "@/lib/partners/macros";
import * as z from "zod/v4";

export const appsFlyerMacroExactValueSchema = z
  .string()
  .refine((v) => PARTNER_MACRO_VALUES.includes(v), {
    message: `Value must be one of: ${PARTNER_MACRO_VALUES.join(", ")}`,
  });

/** Free-form value; every `{{...}}` token must be a known macro. */
export const appsFlyerMacroTemplateValueSchema = z
  .string()
  .refine((v) => isValidPartnerMacroTemplate(v), {
    message: `Invalid macro in value. Use only: ${PARTNER_MACRO_VALUES.join(", ")}`,
  });

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
