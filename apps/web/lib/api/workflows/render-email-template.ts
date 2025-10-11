import { EmailTemplateVariables } from "@/lib/types";

/**
 * Renders an email template by replacing variable placeholders with actual values.
 *
 * Supports Handlebars-style syntax with optional fallback values:
 * - `{{variableName}}` - replaced with the variable value
 * - `{{variableName|fallback}}` - replaced with the variable value, or fallback if variable is null/undefined
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

export function renderEmailTemplate({
  template,
  variables,
}: {
  template: string;
  variables: Partial<EmailTemplateVariables>;
}): string {
  return template.replace(
    /{{\s*([\w.]+)(?:\|([^}]+))?\s*}}/g,
    (_, key, fallback) => {
      const value = variables[key];
      return value != null ? String(value) : fallback ?? "";
    },
  );
}
