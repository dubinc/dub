import { DubApiError } from "../api/errors";

const cronSecret = process.env.CRON_SECRET;

export const verifyVercelSignature = async (req: Request) => {
  // skip verification in local development
  if (process.env.VERCEL !== "1") {
    return;
  }

  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Vercel Authorization header is required.",
    });
  }

  if (!cronSecret) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "CRON_SECRET environment variable is not set.",
    });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid Vercel Authorization header.",
    });
  }
};
