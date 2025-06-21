export const getHostnameFromRequest = (req: Request) => {
  const source = req.headers.get("referer") || req.headers.get("origin");
  if (!source) return null;
  try {
    const sourceUrl = new URL(source);
    return sourceUrl.hostname.replace(/^www\./, "");
  } catch (error) {
    console.log("Error getting hostname from request", { source, error });
    return null;
  }
};

export const verifyAnalyticsAllowedHostnames = ({
  allowedHostnames,
  req,
}: {
  allowedHostnames: string[];
  req: Request;
}) => {
  // If no allowed hostnames are set, allow the request
  if (!allowedHostnames || allowedHostnames.length === 0) {
    return true;
  }

  const hostname = getHostnameFromRequest(req);

  if (!hostname) {
    console.log("Click not recorded ❌ – No hostname found in request.", {
      allowedHostnames,
    });
    return false;
  }

  // Check for exact matches first (including root domain)
  if (allowedHostnames.includes(hostname)) {
    return true;
  }

  // Check for wildcard subdomain matches
  const wildcardMatches = allowedHostnames
    .filter((domain) => domain.startsWith("*."))
    .map((domain) => domain.slice(2)); // Remove the "*.", leaving just the domain

  for (const domain of wildcardMatches) {
    // Allow only proper subdomains: ensure hostname ends with ".domain.com"
    if (hostname.endsWith(`.${domain}`)) {
      return true;
    }
  }

  console.log(
    `Click not recorded ❌ – Hostname ${hostname} does not match any allowed patterns.`,
    {
      allowedHostnames,
    },
  );

  return false;
};
