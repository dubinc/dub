// Determine whether a fetched page can be displayed in an iframe by the
// requesting domain, given the response's CSP / X-Frame-Options headers.
// The caller is responsible for fetching the URL (use an SSRF-safe fetcher).
export const isIframeable = ({
  headers,
  requestDomain,
}: {
  headers: Headers;
  requestDomain: string;
}) => {
  const cspHeader = headers.get("content-security-policy");
  if (cspHeader) {
    const frameAncestorsMatch = cspHeader.match(
      /frame-ancestors\s+([\s\S]+?)(?=;|$)/i,
    );
    if (frameAncestorsMatch) {
      if (frameAncestorsMatch[1] === "*") {
        return true;
      }
      const allowedOrigins = frameAncestorsMatch[1].split(/\s+/);
      if (allowedOrigins.includes(requestDomain)) {
        return true;
      }
    }
  }

  const xFrameOptions = headers.get("X-Frame-Options");
  if (xFrameOptions === "DENY" || xFrameOptions === "SAMEORIGIN") {
    return false;
  }

  return true;
};
