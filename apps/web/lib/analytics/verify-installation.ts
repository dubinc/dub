type VerifyErrorCode =
  | "not_installed"
  | "missing_attributes"
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

export function analyzeDubAnalyticsScript(
  html: string,
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
