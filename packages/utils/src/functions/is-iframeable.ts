// check if a link can be displayed in an iframe
export const isIframeable = async ({
  url,
  requestDomain,
}: {
  url: string;
  requestDomain: string;
}) => {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Dub.co",
    },
  });

  const xFrameOptions = res.headers.get("X-Frame-Options");
  if (xFrameOptions === "DENY" || xFrameOptions === "SAMEORIGIN") {
    return false;
  }

  const cspHeader = res.headers.get("content-security-policy");
  if (!cspHeader) {
    return true;
  }

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

  return false;
};
