import { ErrorCode } from "@/lib/api/error-codes";
import { STAGING_DUB_DOMAIN_SUFFIX } from "@/lib/sandbox/constants";
import { DEFAULT_REDIRECTS, RESERVED_SLUGS, validSlugRegex } from "@dub/utils";
import * as z from "zod/v4";

const DUB_LINK_SUFFIX = ".dub.link";

type ApiErrorCode = z.infer<typeof ErrorCode>;

function validateDubLinkLabel(
  label: string,
): { error: string; code: ApiErrorCode } | null {
  if (!label || label.includes(".")) {
    return {
      error: "Invalid .dub.link subdomain format.",
      code: "unprocessable_entity",
    };
  }

  if (label.length < 4) {
    return {
      error: "Subdomain must be at least 4 characters.",
      code: "unprocessable_entity",
    };
  }

  if (!validSlugRegex.test(label)) {
    return {
      error: "Invalid subdomain format.",
      code: "unprocessable_entity",
    };
  }

  if (
    RESERVED_SLUGS.includes(label) ||
    DEFAULT_REDIRECTS[label as keyof typeof DEFAULT_REDIRECTS]
  ) {
    return {
      error: "This subdomain is reserved.",
      code: "unprocessable_entity",
    };
  }

  return null;
}

export function validateDubLinkSubdomain(
  slug: string,
): { error: string; code: ApiErrorCode } | null {
  const lower = slug.trim().toLowerCase();

  // Staging workspaces use `{slug}.staging.dub.link` (e.g. acme.staging.dub.link)
  if (lower.endsWith(STAGING_DUB_DOMAIN_SUFFIX)) {
    return validateDubLinkLabel(
      lower.slice(0, -STAGING_DUB_DOMAIN_SUFFIX.length),
    );
  }

  if (!lower.endsWith(DUB_LINK_SUFFIX)) {
    return null;
  }

  return validateDubLinkLabel(lower.slice(0, -DUB_LINK_SUFFIX.length));
}
