import crypto from "crypto";

export const verifyShopifySignature = async ({
  body,
  signature,
}: {
  body: Record<string, unknown>;
  signature: string;
}) => {
  const generatedSignature = crypto
    .createHmac("sha256", `${process.env.SHOPIFY_WEBHOOK_SECRET}`)
    .update(JSON.stringify(body))
    .digest("base64");

  if (generatedSignature !== signature) {
    throw new Error("Invalid webhook signature.");
  }
};
