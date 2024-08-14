// Create a signature for a webhook request
// Edge friendly
export const createWebhookSignature = async (secret: string, rawBody: any) => {
  if (!secret) {
    throw new Error("A secret must be provided to create a webhook signature.");
  }

  const keyData = new TextEncoder().encode(secret);
  const messageData = new TextEncoder().encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const hexSignature = signatureArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  console.log("Webhook signature", hexSignature);

  return hexSignature;

  // return crypto
  //   .createHmac("sha256", secret)
  //   .update(JSON.stringify(rawBody))
  //   .digest("hex");
};
