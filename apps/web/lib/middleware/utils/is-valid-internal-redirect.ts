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

    // Check for potential redirect loops by examining the path
    const currentPath = new URL(currentUrl).pathname;
    const redirectPathname = redirectUrl.pathname;
    
    // If the redirect path is the same as current path, it's a loop
    if (currentPath === redirectPathname) {
      return false;
    }
    
    // Check for repeated path segments that could indicate a loop
    const currentSegments = currentPath.split("/").filter(Boolean);
    const redirectSegments = redirectPathname.split("/").filter(Boolean);
    
    // If the redirect path contains the same segments as current path, it might be a loop
    if (currentSegments.length > 0 && redirectSegments.length > 0) {
      const firstCurrentSegment = currentSegments[0];
      const firstRedirectSegment = redirectSegments[0];
      
      // If the first segment is the same and appears multiple times, it's likely a loop
      if (firstCurrentSegment === firstRedirectSegment) {
        const currentSegmentCount = currentSegments.filter(s => s === firstCurrentSegment).length;
        const redirectSegmentCount = redirectSegments.filter(s => s === firstRedirectSegment).length;
        
        if (currentSegmentCount > 1 || redirectSegmentCount > 1) {
          return false;
        }
      }
    }

    return redirectUrl.origin === currentOrigin;
  } catch (error) {
    // Invalid URL construction
    return false;
  }
}
