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

  const source = req.headers.get("referer") || req.headers.get("origin");
  const sourceUrl = source ? new URL(source) : null;
  const hostname = sourceUrl?.hostname;

  if (!hostname) {
    console.log("No hostname found in request. Denying request ❌", {
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
    // Check if the hostname ends with the domain and is not the root domain
    if (hostname.endsWith(domain) && hostname !== domain) {
      return true;
    }
  }

  console.log(
    `Hostname ${hostname} does not match any allowed patterns. Denying request ❌`,
    {
      allowedHostnames,
    },
  );

  return false;
};
