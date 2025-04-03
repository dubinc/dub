/**
 * Escapes a string for use in a regular expression.
 * https://stackoverflow.com/a/6969486
 */
export function regexEscape(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
