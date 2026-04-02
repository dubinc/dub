import * as z from "zod/v4";
import { appsFlyerParameterSchema } from "./schema";

interface AppsFlyerParameterContext {
  partnerName: string | null | undefined;
  partnerLinkKey: string | null;
}

const macroReplacements: Record<string, keyof AppsFlyerParameterContext> = {
  "{{PARTNER_NAME}}": "partnerName",
  "{{PARTNER_LINK_KEY}}": "partnerLinkKey",
};

// Resolve macros in parameter values and append them to a URL
export function applyAppsFlyerParameters({
  url,
  parameters,
  context,
}: {
  url: string;
  parameters: z.infer<typeof appsFlyerParameterSchema>[];
  context: AppsFlyerParameterContext;
}) {
  const urlObj = new URL(url);

  for (const { key, value } of parameters) {
    let resolvedValue = value;

    for (const [macro, contextKey] of Object.entries(macroReplacements)) {
      resolvedValue = resolvedValue.replaceAll(
        macro,
        context[contextKey] ?? "",
      );
    }

    urlObj.searchParams.set(key, resolvedValue);
  }

  return urlObj.toString();
}
