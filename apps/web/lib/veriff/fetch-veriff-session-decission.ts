import crypto from "crypto";
import { veriffDecisionEventSchema } from "./schema";

// GET /v1/sessions/{sessionId}/decision
export async function fetchVeriffSessionDecision(sessionId: string) {
  const apiKey = process.env.VERIFF_API_KEY;
  const sharedSecret = process.env.VERIFF_WEBHOOK_SECRET;

  if (!apiKey) {
    throw new Error("VERIFF_API_KEY is not configured.");
  }

  if (!sharedSecret) {
    throw new Error("VERIFF_WEBHOOK_SECRET is not configured.");
  }

  const hmacSignature = crypto
    .createHmac("sha256", sharedSecret)
    .update(sessionId)
    .digest("hex");

  const rawResponse = await fetch(
    `https://stationapi.veriff.com/v1/sessions/${sessionId}/decision`,
    {
      method: "GET",
      headers: {
        "X-AUTH-CLIENT": apiKey,
        "X-HMAC-SIGNATURE": hmacSignature,
        "Content-Type": "application/json",
      },
    },
  );

  const responseText = await rawResponse.text();
  const response = responseText ? JSON.parse(responseText) : null;

  if (!rawResponse.ok) {
    throw new VeriffApiError({
      message: `[Veriff] Failed to fetch decision for session ${sessionId}: ${rawResponse.status}`,
      status: rawResponse.status,
      responseBody: responseText || null,
    });
  }

  return veriffDecisionEventSchema.parse(response);
}

class VeriffApiError extends Error {
  status: number;
  responseBody: string | null;

  constructor({
    message,
    status,
    responseBody,
  }: {
    message: string;
    status: number;
    responseBody: string | null;
  }) {
    super(message);
    this.name = "VeriffApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}
