import crypto from "crypto";

// Create a signature for a webhook request
export const createWebhookSignature = (secret: string, rawBody: any) => {
  if (!secret) {
    throw new Error("A secret must be provided to create a webhook signature.");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(rawBody))
    .digest("hex");
};
