import { ErrorCode } from "@/lib/api/error-codes";
import { DEFAULT_REDIRECTS, RESERVED_SLUGS, validSlugRegex } from "@dub/utils";
import type { z } from "zod/v4";

const DUB_LINK_SUFFIX = ".dub.link";

type ApiErrorCode = z.infer<typeof ErrorCode>;

export function validateDubLinkSubdomain(
  slug: string,
): { error: string; code: ApiErrorCode } | null {
  const lower = slug.trim().toLowerCase();

  if (!lower.endsWith(DUB_LINK_SUFFIX)) {
    return null;
  }

  const label = lower.slice(0, -DUB_LINK_SUFFIX.length);

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
