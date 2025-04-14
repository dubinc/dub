export const verifyAnalyticsAllowedHostnames = ({
  allowedHostnames,
  req,
}: {
  allowedHostnames: string[];
  req: Request;
}) => {
  if (allowedHostnames.length > 0) {
    const source = req.headers.get("referer") || req.headers.get("origin");
    const sourceUrl = source ? new URL(source) : null;
    const hostname = sourceUrl?.hostname.replace(/^www\./, "");

    return hostname && allowedHostnames.includes(hostname);
  }

  return true;
};
