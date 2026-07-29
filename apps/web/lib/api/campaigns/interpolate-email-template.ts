import { EmailTemplateVariables } from "@/lib/types";

/**
 * Escapes a string for safe insertion into HTML text nodes and double-quoted attributes.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders PartnerLink placeholders: http(s) URLs become a single anchor; otherwise escaped text.
 */
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
 * Substitutes campaign email template placeholders after HTML sanitization.
 *
 * **Syntax** — Whitespace around names and `|` is optional, e.g. `{{PartnerName}}`,
 * `{{ PartnerName | Guest }}`.
 *
 * **Values**
 * - Variable present → use its string form.
 * - Variable null/undefined → use pipe fallback if any, else empty string.
 *
 * **Output**
 * - `PartnerName`, `PartnerEmail`, etc.: HTML-escaped (treat as plain text; no raw HTML).
 * - `PartnerLink`: valid `http:` / `https:` URL → clickable `<a>`; else escaped text.
 *
 * @param text - HTML string containing `{{VariableName}}` or `{{Name | fallback}}`
 * @param variables - Map of template variable names to values
 * @returns HTML with placeholders replaced
 *
 * @example
 * ```ts
 * interpolateEmailTemplate({
 *   text: "Hello {{PartnerName|Guest}}!",
 *   variables: { PartnerName: "John" },
 * });
 * // "Hello John!" (Guest ignored when value present)
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
