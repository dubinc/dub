import { getValidInternalRedirectPath } from "@/lib/middleware/utils/is-valid-internal-redirect";
import { ADMIN_HOSTNAMES, PARTNERS_HOSTNAMES } from "@dub/utils";

export function getPostLoginRedirect({
  next,
  searchParamsNext,
}: {
  next?: string | null;
  searchParamsNext?: string | null;
}) {
  const currentUrl = window.location.href;

  const explicit = getValidInternalRedirectPath({
    redirectPath: next ?? searchParamsNext,
    currentUrl,
  });

  if (explicit) {
    return explicit;
  }

  const { hostname } = new URL(currentUrl);

  if (ADMIN_HOSTNAMES.has(hostname) || PARTNERS_HOSTNAMES.has(hostname)) {
    return "/";
  }

  return "/workspaces";
}
