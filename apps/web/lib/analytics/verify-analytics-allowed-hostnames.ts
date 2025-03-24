import { DubApiError } from "../api/errors";

export const verifyAnalyticsAllowedHostnames = ({
  allowedHostnames,
  req,
}: {
  allowedHostnames: string[];
  req: Request;
}) => {
  if (!allowedHostnames || allowedHostnames.length === 0) {
    return;
  }

  const source = req.headers.get("referer") || req.headers.get("origin");
  const sourceUrl = source ? new URL(source) : null;
  const hostname = sourceUrl?.hostname.replace(/^www\./, "");

  if (!hostname) {
    console.error("Hostname not found.", {
      source,
    });

    throw new DubApiError({
      code: "bad_request",
      message: "No referer or origin header found in request.",
    });
  }

  if (!allowedHostnames.includes(hostname)) {
    console.error("Hostname not allowed.", {
      hostname,
      allowedHostnames,
    });

    throw new DubApiError({
      code: "forbidden",
      message: `Hostname ${hostname} not included in allowed hostnames (${allowedHostnames.join(
        ", ",
      )}).`,
    });
  }
};
