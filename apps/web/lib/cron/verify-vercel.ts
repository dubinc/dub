import { DubApiError } from "../api/errors";

export const verifyVercelSignature = async (req: Request) => {
  // skip verification in local development
  if (process.env.VERCEL !== "1") {
    return;
  }
  const authHeader = req.headers.get("authorization");

  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid QStash request signature",
    });
  }
};
