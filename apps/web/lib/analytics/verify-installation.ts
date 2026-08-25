export const VERIFY_ERROR_CODES = [
  "not_installed",
  "missing_attributes",
  "duplicate",
  "malformed",
] as const;

export type VerifyErrorCode = (typeof VERIFY_ERROR_CODES)[number];

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
      error: VerifyErrorCode | "unreachable";
    };

const ERROR_HEADLINE: Record<VerifyErrorCode | "unreachable", string> = {
  not_installed: "Script is not installed.",
  missing_attributes: "Script missing attributes.",
  duplicate: "Duplicate script.",
  malformed: "Malformed script.",
  unreachable: "We couldn’t reach this hostname.",
};

export const VERIFY_DOCS_HREF = "https://dub.co/docs/sdks/client-side";
export const VERIFY_SUPPORT_HREF = "https://dub.co/support";

export function getVerifyErrorHeadline(
  error: VerifyErrorCode | "unreachable",
) {
  return ERROR_HEADLINE[error];
}

const SCRIPT_TAG_RE = /<script\b[^>]*>/gi;
const DUB_SCRIPT_RE =
  /dubcdn\.com\/analytics|data-sdkn=["']@dub\/analytics["']|@dub\/analytics/i;
const DUB_SRC_RE = /src=["'][^"']*dubcdn\.com\/analytics[^"']*["']/i;
const SDK_NAME_RE = /data-sdkn=["']@dub\/analytics["']/i;

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

  if (!hasSdkName) {
    return "missing_attributes";
  }

  return "ok";
}

export function toVerifySiteUrl(hostname: string) {
  if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
    return hostname;
  }

  return `https://${hostname}`;
}
