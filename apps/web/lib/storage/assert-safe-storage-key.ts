const MAX_STORAGE_KEY_LENGTH = 1024;

/**
 * Rejects object keys that the S3 signer would resolve to a different path.
 * `..`, encoded dots, and a leading slash all pass a prefix check and are
 * then normalised by `Request` before the signature is computed.
 */
export function assertSafeStorageKey(key: string): void {
  if (!isSafeStorageKey(key)) {
    throw new Error("Invalid storage key.");
  }
}

export function isSafeStorageKey(key: string): boolean {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > MAX_STORAGE_KEY_LENGTH) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (key.includes("\\") || key.includes("//")) return false;
  if (/[\u0000-\u001F\u007F?#]/.test(key)) return false;

  const segments = key.split("/");
  if (segments.some((segment) => !isSafePathSegment(segment))) return false;

  try {
    return resolvedPathname(key) === encodedPathname(key);
  } catch {
    return false;
  }
}

/** True when an http(s) URL path contains a relative segment. Non-URLs are ignored. */
export function urlPathHasRelativeSegments(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;

  const originMatch = trimmed.match(/^https?:\/\/[^/?#]*/i);
  if (!originMatch) return true;

  const rawPath = trimmed.slice(originMatch[0].length).split(/[?#]/)[0] ?? "";
  if (rawPath.includes("\\") || rawPath.includes("\0")) return true;

  return rawPath
    .split("/")
    .filter((segment) => segment.length > 0)
    .some((segment) => !isSafePathSegment(segment));
}

function isSafePathSegment(segment: string): boolean {
  if (segment.length === 0) return false;
  if (isDotSegment(segment)) return false;
  return !decodesToTraversal(segment);
}

function isDotSegment(segment: string): boolean {
  return [segment, segment.normalize("NFKC")].some((form) => {
    const dots = form.replace(/%2e/gi, ".");
    return dots === "." || dots === "..";
  });
}

// Repeated decoding catches `%2e%2e`, `%252e%252e`, and `%2f`-smuggled `..`.
// A decoded `%25` is a literal `%`, so decoding stops once no `%HH` remains.
function decodesToTraversal(segment: string): boolean {
  try {
    decodeURIComponent(segment);
  } catch {
    return true;
  }

  let current = segment;

  for (let depth = 0; depth < 3; depth++) {
    if (containsTraversal(current)) return true;
    if (!/%[0-9a-f]{2}/i.test(current)) return false;

    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return true;
    }

    if (decoded === current) return false;
    current = decoded;
  }

  return containsTraversal(current);
}

function containsTraversal(value: string): boolean {
  if (value.includes("\0") || isDotSegment(value)) return true;
  if (!value.includes("/") && !value.includes("\\")) return false;

  return value
    .split(/[/\\]/)
    .some((part) => part.length === 0 || isDotSegment(part));
}

function resolvedPathname(key: string): string {
  return new URL(`https://storage.invalid/${key}`).pathname;
}

function encodedPathname(key: string): string {
  const url = new URL("https://storage.invalid");
  url.pathname =
    "/" +
    key
      .split("/")
      .map((segment) => {
        const part = new URL("https://storage.invalid");
        part.pathname = `/${segment}`;
        return part.pathname.slice(1);
      })
      .join("/");
  return url.pathname;
}
