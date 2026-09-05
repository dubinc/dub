export interface PartnerMacroContext {
  partnerName: string;
  partnerLinkKey: string;
}

export const PARTNER_MACROS = [
  {
    macro: "{{PARTNER_NAME}}",
    description: "The partner's name (e.g. 'John Doe')",
  },
  {
    macro: "{{PARTNER_LINK_KEY}}",
    description: "The partner's link key (e.g. 'john-doe')",
  },
] as const;

export const PARTNER_MACRO_VALUES: readonly string[] = PARTNER_MACROS.map(
  (m) => m.macro,
);

const MACRO_TOKEN_RE = /\{\{[^}]+\}\}/g;

// Every `{{...}}` substring must be a known partner macro.
export function isValidPartnerMacroTemplate(value: string): boolean {
  const matches = value.match(MACRO_TOKEN_RE) ?? [];
  return matches.every((token) => PARTNER_MACRO_VALUES.includes(token));
}

// Validates a free-form value (any `{{...}}` tokens must be known macros).
export function assertValidPartnerMacroValue(value: string): void {
  if (!isValidPartnerMacroTemplate(value)) {
    throw new Error(
      `Invalid macro in value. Use only: ${PARTNER_MACRO_VALUES.join(", ")}`,
    );
  }
}

const macroReplacements: Record<string, keyof PartnerMacroContext> = {
  "{{PARTNER_NAME}}": "partnerName",
  "{{PARTNER_LINK_KEY}}": "partnerLinkKey",
};

export function resolvePartnerMacros(
  value: string,
  context: PartnerMacroContext,
): string {
  let resolvedValue = value;

  for (const [macro, contextKey] of Object.entries(macroReplacements)) {
    resolvedValue = resolvedValue.replaceAll(macro, context[contextKey] ?? "");
  }

  return resolvedValue;
}
