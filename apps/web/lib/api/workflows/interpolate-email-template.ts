import { EmailTemplateVariables } from "@/lib/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function partnerLinkToAnchorOrText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return escapeHtml(trimmed);
    }
    return `<a href="${escapeHtml(u.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(trimmed)}</a>`;
  } catch {
    return escapeHtml(trimmed);
  }
}

/**
 * Renders an email template by replacing variable placeholders with actual values.
 *
 * Supports Handlebars-style syntax with optional fallback values:
 * - `{{variableName}}` - replaced with the variable value
 * - `{{variableName|fallback}}` - replaced with the variable value, or fallback if variable is null/undefined
 *
 * `{{PartnerLink}}` (and pipe variants) with a valid http(s) URL becomes a clickable `<a>` tag.
 *
 * @param template - The email template string containing variable placeholders
 * @param variables - Object containing variable names and their values to substitute
 * @returns The rendered template with all placeholders replaced by their corresponding values
 *
 * @example
 * ```
 * const template = "Hello {{PartnerName|Guest}}, welcome to the program!"
 * const variables = { PartnerName: "John" };
 * const result = renderEmailTemplate({ template, variables });
 * // Result: "Hello John, welcome to the program!"
 * ```
 */

export function interpolateEmailTemplate({
  text,
  variables,
}: {
  text: string;
  variables: Partial<EmailTemplateVariables>;
}): string {
  return text.replace(
    /{{\s*([\w.]+)\s*(?:\|\s*([^}]*?))?\s*}}/g,
    (_, key, fallback) => {
      const value = variables[key];
      const resolved = value != null ? String(value) : fallback?.trim() ?? "";
      if (key === "PartnerLink") {
        return partnerLinkToAnchorOrText(resolved);
      }
      return escapeHtml(resolved);
    },
  );
}
