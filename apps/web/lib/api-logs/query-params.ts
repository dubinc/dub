import { maskSensitiveValue } from "./mask-sensitive-fields";

export const MAX_QUERY_STRING_LENGTH = 4096;
export const MAX_QUERY_PARAM_ENTRIES = 100;
export const MAX_QUERY_PARAM_KEY_LENGTH = 100;
export const MAX_QUERY_PARAM_VALUE_LENGTH = 1000;

const SENSITIVE_QUERY_PARAM_KEYS = new Set([
  "token",
  "api_key",
  "apikey",
  "api-key",
  "password",
  "secret",
  "authorization",
  "auth",
  "access_token",
  "refresh_token",
  "client_secret",
  "client_id",
  "key",
]);

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function parseQueryParams(
  searchParams: URLSearchParams,
): Record<string, string | string[]> | null {
  const queryString = searchParams.toString();

  if (queryString.length === 0) {
    return null;
  }

  // Skip parsing if the query string exceeds the max length (safety check)
  if (queryString.length > MAX_QUERY_STRING_LENGTH) {
    return null;
  }

  const params: Record<string, string | string[]> = Object.create(null);
  let entryCount = 0;

  for (const [rawKey, rawValue] of searchParams.entries()) {
    if (entryCount >= MAX_QUERY_PARAM_ENTRIES) {
      break;
    }

    const key = truncate(rawKey, MAX_QUERY_PARAM_KEY_LENGTH);
    let value = truncate(rawValue, MAX_QUERY_PARAM_VALUE_LENGTH);

    const isSensitiveKey = SENSITIVE_QUERY_PARAM_KEYS.has(key.toLowerCase());

    if (isSensitiveKey) {
      value = maskSensitiveValue(value);
    }

    if (Object.hasOwn(params, key)) {
      const existing = params[key];
      Array.isArray(existing)
        ? existing.push(value)
        : (params[key] = [existing, value]);
    } else {
      params[key] = value;
    }

    entryCount++;
  }

  return params;
}
