type VerifyErrorCode =
  | "not_installed"
  | "missing_attributes"
  | "missing_refer_domain"
  | "duplicate"
  | "malformed";

type VerifyError = VerifyErrorCode | "unreachable" | "unsupported";

export type VerifyInstallationResult =
  | {
      status: "success";
      hostname: string;
      verifiedAt: string;
      user: {
        id: string;
        name: string | null;
        image: string | null;
      };
    }
  | {
      status: "error";
      hostname: string;
      error: VerifyError;
      referDomain?: string;
    };

const SCRIPT_TAG_RE = /<script\b[^>]*>/gi;
const DUB_SCRIPT_RE =
  /dubcdn\.com\/analytics|data-sdkn=["']@dub\/analytics["']|@dub\/analytics/i;
const DUB_SRC_RE =
  /src\s*=\s*(?:["'][^"']*dubcdn\.com\/analytics[^"']*["']|[^\s>]*dubcdn\.com\/analytics[^\s>]*)/i;
const CONVERSION_SRC_RE =
  /src\s*=\s*(?:["'][^"']*dubcdn\.com\/analytics[^"']*conversion-tracking[^"']*["']|[^\s>]*dubcdn\.com\/analytics[^\s>]*conversion-tracking[^\s>]*)/i;
const SDK_NAME_RE =
  /data-sdkn\s*=\s*(?:["']@dub\/analytics["']|@dub\/analytics(?=[\s>/]))/i;
const PUBLISHABLE_KEY_RE = /data-publishable-key=/i;
const ATTR_RE = (name: string) =>
  new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&");

const normalizeReferDomain = (value: string) =>
  value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

const getScriptAttr = (tag: string, name: string) => {
  const match = tag.match(ATTR_RE(name));
  return match ? decodeHtmlEntities(match[2]) : null;
};

const parseScriptReferDomain = (tag: string) => {
  const rawDomains = getScriptAttr(tag, "data-domains");
  if (rawDomains) {
    try {
      const parsed = JSON.parse(rawDomains) as { refer?: unknown };
      if (typeof parsed.refer === "string" && parsed.refer.trim()) {
        return parsed.refer.trim();
      }
    } catch {
      // Fall through to the legacy data-short-domain attribute.
    }
  }

  const shortDomain = getScriptAttr(tag, "data-short-domain");
  return shortDomain?.trim() || null;
};

export function analyzeDubAnalyticsScript(
  html: string,
  { referDomain }: { referDomain?: string | null } = {},
): "ok" | VerifyErrorCode {
  const scriptTags = html.match(SCRIPT_TAG_RE) ?? [];
  const dubScripts = scriptTags.filter((tag) => DUB_SCRIPT_RE.test(tag));

  if (dubScripts.length === 0) {
    if (DUB_SCRIPT_RE.test(html)) {
      return "malformed";
    }

    return "not_installed";
  }

  if (dubScripts.length > 1) {
    return "duplicate";
  }

  const tag = dubScripts[0];
  const hasSrc = DUB_SRC_RE.test(tag);
  const hasSdkName = SDK_NAME_RE.test(tag);

  if (!hasSrc && !hasSdkName) {
    return "malformed";
  }

  if (
    CONVERSION_SRC_RE.test(tag) &&
    !hasSdkName &&
    !PUBLISHABLE_KEY_RE.test(tag)
  ) {
    return "missing_attributes";
  }

  const expectedReferDomain = referDomain?.trim();
  if (expectedReferDomain) {
    const scriptReferDomain = parseScriptReferDomain(tag);
    if (
      !scriptReferDomain ||
      normalizeReferDomain(scriptReferDomain) !==
        normalizeReferDomain(expectedReferDomain)
    ) {
      return "missing_refer_domain";
    }
  }

  return "ok";
}

export function toVerifySiteUrl(hostname: string) {
  if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
    return hostname;
  }

  if (hostname === "localhost" || hostname.startsWith("localhost:")) {
    return `http://${hostname}`;
  }

  return `https://${hostname}`;
}
