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

  console.log("allowedHostnames", allowedHostnames);
  console.log("hostname", hostname);

  return true;

  // return hostname && allowedHostnames.includes(hostname);
};
