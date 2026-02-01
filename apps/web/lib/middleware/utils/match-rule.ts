import { RedisRuleLink } from "../api/links/rule-cache";

/**
 * Pattern matching for redirect rules.
 *
 * Supports two pattern syntaxes:
 * 1. Wildcard: /blog/* matches /blog/anything, /blog/foo/bar
 * 2. Named params: /docs/:slug matches /docs/intro, captures { slug: "intro" }
 *
 * Patterns are sorted by specificity (more specific patterns match first).
 */

export interface MatchResult {
  rule: RedisRuleLink;
  params: Record<string, string>;
  matchedPath: string;
}

/**
 * Convert a user-friendly pattern to a regex
 * Examples:
 *   /blog/* -> /^\/blog\/(.*)$/
 *   /docs/:slug -> /^\/docs\/([^\/]+)$/
 *   /api/:version/:endpoint/* -> /^\/api\/([^\/]+)\/([^\/]+)\/(.*)$/
 */
export function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and :
  let regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    // Convert :param to capture group for single path segment
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "([^/]+)")
    // Convert /* to capture group for rest of path (must be at end)
    .replace(/\/\*$/, "/(.*)");

  // Handle standalone * at end
  if (regexStr.endsWith("*")) {
    regexStr = regexStr.slice(0, -1) + "(.*)";
  }

  return new RegExp(`^${regexStr}$`);
}

/**
 * Extract parameter names from a pattern
 * Example: /docs/:slug/:section -> ["slug", "section"]
 */
export function extractParamNames(pattern: string): string[] {
  const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const names: string[] = [];
  let match;

  while ((match = paramRegex.exec(pattern)) !== null) {
    names.push(match[1]);
  }

  // Add "rest" for wildcard captures
  if (pattern.endsWith("/*") || pattern.endsWith("*")) {
    names.push("rest");
  }

  return names;
}

/**
 * Calculate pattern specificity for sorting.
 * Higher score = more specific = should match first.
 *
 * Scoring:
 * - Each literal segment: +10
 * - Each :param segment: +5
 * - Wildcard at end: +1
 */
export function getPatternSpecificity(pattern: string): number {
  const segments = pattern.split("/").filter(Boolean);
  let score = 0;

  for (const segment of segments) {
    if (segment === "*") {
      score += 1;
    } else if (segment.startsWith(":")) {
      score += 5;
    } else {
      score += 10;
    }
  }

  return score;
}

/**
 * Match a path against a set of rules.
 * Returns the most specific matching rule, or null if no match.
 */
export function matchRules(
  path: string,
  rules: RedisRuleLink[],
): MatchResult | null {
  // Sort rules by specificity (most specific first)
  const sortedRules = [...rules].sort(
    (a, b) =>
      getPatternSpecificity(b.rulePattern) -
      getPatternSpecificity(a.rulePattern),
  );

  for (const rule of sortedRules) {
    const regex = patternToRegex(rule.rulePattern);
    const match = path.match(regex);

    if (match) {
      const paramNames = extractParamNames(rule.rulePattern);
      const params: Record<string, string> = {};

      // Map captured groups to param names
      for (let i = 0; i < paramNames.length; i++) {
        if (match[i + 1] !== undefined) {
          params[paramNames[i]] = match[i + 1];
        }
      }

      return {
        rule,
        params,
        matchedPath: path,
      };
    }
  }

  return null;
}

/**
 * Validate a pattern syntax.
 * Returns error message if invalid, null if valid.
 */
export function validatePattern(pattern: string): string | null {
  if (!pattern) {
    return "Pattern is required";
  }

  if (!pattern.startsWith("/")) {
    return "Pattern must start with /";
  }

  // Check for invalid characters
  if (/[<>{}]/.test(pattern)) {
    return "Pattern contains invalid characters";
  }

  // Check that :params have valid names
  const invalidParams = pattern.match(/:([^a-zA-Z_]|$)/g);
  if (invalidParams) {
    return "Invalid parameter name in pattern";
  }

  // Wildcards can only appear at the end
  const wildcardIndex = pattern.indexOf("*");
  if (wildcardIndex !== -1 && wildcardIndex !== pattern.length - 1) {
    return "Wildcard (*) can only appear at the end of a pattern";
  }

  try {
    patternToRegex(pattern);
    return null;
  } catch {
    return "Invalid pattern syntax";
  }
}
