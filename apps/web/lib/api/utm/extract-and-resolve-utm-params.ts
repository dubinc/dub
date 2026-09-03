import {
  PartnerMacroContext,
  resolvePartnerMacros,
} from "@/lib/partners/macros";
import { UTM_TAG_MAX_LENGTH } from "@/lib/zod/schemas/utm";
import { extractUtmParams } from "./extract-utm-params";

// Extracts UTM params from a template and resolves partner macros
// (e.g. {{PARTNER_NAME}}, {{PARTNER_LINK_KEY}}) against the given context.
export const extractAndResolveUtmParams = (
  utmTemplate: Parameters<typeof extractUtmParams>[0],
  context: PartnerMacroContext,
  options?: Parameters<typeof extractUtmParams>[1],
) => {
  const params = extractUtmParams(utmTemplate, options);

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (value == null) {
        return [key, value];
      }

      const resolved = resolvePartnerMacros(value, context).slice(
        0,
        UTM_TAG_MAX_LENGTH,
      );

      return [key, resolved];
    }),
  ) as ReturnType<typeof extractUtmParams>;
};
