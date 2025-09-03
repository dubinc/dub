/**
 * Validates if a redirect URL is safe for internal redirects
 */
export function isValidInternalRedirect(
  redirectPath: string,
  currentUrl: string | URL,
): boolean {
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
