"server-only";

/**
 * Sanitizes and validates markdown content for safe use in email templates.
 *
 * This function:
 * - Trims whitespace
 * - Validates the content is valid text (not binary)
 * - Checks for suspicious patterns that could cause DoS issues
 * - Normalizes line endings
 *
 * @param markdown - The markdown string to sanitize
 * @returns The sanitized markdown string, or null if invalid/binary content detected
 */
export function sanitizeMarkdown(
  markdown: string | null | undefined,
): string | null {
  if (!markdown || typeof markdown !== "string") {
    return null;
  }

  // Trim whitespace
  let sanitized = markdown.trim();

  // Return null if empty after trimming
  if (!sanitized) {
    return null;
  }

  // Check for binary content - markdown should be valid UTF-8 text
  // Reject if there are null bytes (indicates binary content)
  if (sanitized.includes("\0")) {
    return null;
  }

  // Check for suspicious patterns that could cause DoS or rendering issues
  // Reject content with excessively long lines to avoid malformed markdown
  const maxLineLength = 1000;
  const hasExcessivelyLongLine = sanitized
    .split("\n")
    .some((line) => line.length > maxLineLength);

  if (hasExcessivelyLongLine) {
    return null;
  }

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return sanitized;
}
