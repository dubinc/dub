import { DubApiError } from "@/lib/api/errors";
import { timingSafeCompare } from "@/lib/webhook/timing-safe-compare";
import crypto from "crypto";

const INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || "";

export async function verifyIntercomWebhookSignature(
  req: Request,
): Promise<string> {
  const rawBody = await req.text();
  const hubSignature = req.headers.get("X-Hub-Signature");
  const bodySignature = req.headers.get("X-Body-Signature");

  if (!INTERCOM_CLIENT_SECRET) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Missing INTERCOM_CLIENT_SECRET environment variable.",
    });
  }

  // Uninstall and health-check use X-Body-Signature
  if (!hubSignature && !bodySignature) {
    throw new DubApiError({
      code: "bad_request",
      message: "Missing X-Hub-Signature or X-Body-Signature header.",
    });
  }

  let expectedSignature: string;
  let providedSignature: string;

  if (hubSignature) {
    expectedSignature =
      "sha1=" +
      crypto
        .createHmac("sha1", INTERCOM_CLIENT_SECRET)
        .update(rawBody)
        .digest("hex");

    providedSignature = hubSignature;
  } else if (bodySignature) {
    expectedSignature = crypto
      .createHmac("sha256", INTERCOM_CLIENT_SECRET)
      .update(rawBody)
      .digest("hex");

    providedSignature = bodySignature;
  } else {
    throw new DubApiError({
      code: "bad_request",
      message: "Missing X-Hub-Signature or X-Body-Signature header.",
    });
  }

  if (!timingSafeCompare(providedSignature, expectedSignature)) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Invalid webhook signature.",
    });
  }

  return rawBody;
}
