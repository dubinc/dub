/**
 * Validates if a redirect URL is safe for internal redirects
 */
export function isValidInternalRedirect({
  redirectPath,
  currentUrl,
}: {
  redirectPath: string;
  currentUrl: string | URL;
}): boolean {
  try {
    // Ensure the URL construction results in same-origin redirect
    const redirectUrl = new URL(redirectPath, currentUrl);
    const currentOrigin = new URL(currentUrl).origin;

    return redirectUrl.origin === currentOrigin;
  } catch (error) {
    // Invalid URL construction
    return false;
  }
}

export function getValidInternalRedirectPath({
  redirectPath,
  currentUrl,
}: {
  redirectPath?: string | null;
  currentUrl: string | URL;
}): string | null {
  if (!redirectPath) {
    return null;
  }
  const valid = isValidInternalRedirect({ redirectPath, currentUrl });
  return valid ? redirectPath : null;
}
