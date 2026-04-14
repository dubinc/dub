import { APPSFLYER_MACRO_VALUES } from "./constants";

const MACRO_TOKEN_RE = /\{\{[^}]+\}\}/g;

/** Every `{{...}}` substring must be a known AppsFlyer macro. */
export function isValidAppsFlyerMacroTemplate(value: string): boolean {
  const matches = value.match(MACRO_TOKEN_RE) ?? [];
  return matches.every((token) => APPSFLYER_MACRO_VALUES.includes(token));
}

/**
 * Validates a free-form custom parameter value (any `{{...}}` tokens must be known macros).
 * @throws Error when validation fails.
 */
export function assertAppsFlyerMacroValueParses(value: string): void {
  if (!isValidAppsFlyerMacroTemplate(value)) {
    throw new Error(
      `Invalid macro in value. Use only: ${APPSFLYER_MACRO_VALUES.join(", ")}`,
    );
  }
}
