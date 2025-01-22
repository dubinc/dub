// Create a signature for a webhook request
export const createWebhookSignature = async (secret: string, body: any) => {
  
  const keyData = new TextEncoder().encode(secret);
  const messageData = new TextEncoder().encode(JSON.stringify(body));

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

  return hexSignature;
};
