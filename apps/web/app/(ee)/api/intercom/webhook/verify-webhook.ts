import { DubApiError } from "@/lib/api/errors";
import crypto from "crypto";

const INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || "";

export async function verifyWebhookSignature(req: Request): Promise<string> {
  const rawBody = await req.text();
  const signature = req.headers.get("X-Hub-Signature");

  if (!signature) {
    throw new DubApiError({
      code: "bad_request",
      message: "Missing X-Hub-Signature header.",
    });
  }

  if (!INTERCOM_CLIENT_SECRET) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Missing INTERCOM_CLIENT_SECRET environment variable.",
    });
  }

  const expectedSignature =
    "sha1=" +
    crypto
      .createHmac("sha1", INTERCOM_CLIENT_SECRET)
      .update(rawBody)
      .digest("hex");

  const isSignatureValid = crypto.timingSafeEqual(
    Uint8Array.from(Buffer.from(signature, "utf8")),
    Uint8Array.from(Buffer.from(expectedSignature, "utf8")),
  );

  if (!isSignatureValid) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid webhook signature.",
    });
  }

  return rawBody;
}
