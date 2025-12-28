import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET;

/**
 * Generate a secure unsubscribe token for an email address.
 * The token is a combination of the email and a signature that can be verified.
 */
export function generateUnsubscribeToken(email: string): string {
  if (!TOKEN_SECRET) throw new Error("UNSUBSCRIBE_TOKEN_SECRET is not set");

  const signature = createHmac("sha256", TOKEN_SECRET)
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 16); // Truncate for shorter URLs

  // Base64 encode the email and append the signature
  const encodedEmail = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${encodedEmail}.${signature}`;
}

/**
 * Verify and decode an unsubscribe token.
 * Returns the email if valid, null otherwise.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [encodedEmail, signature] = token.split(".");
    if (!encodedEmail || !signature) {
      return null;
    }

    const email = Buffer.from(encodedEmail, "base64url").toString("utf-8");

    if (!TOKEN_SECRET) throw new Error("UNSUBSCRIBE_TOKEN_SECRET is not set");

    // Verify the signature
    const expectedSignature = createHmac("sha256", TOKEN_SECRET)
      .update(email.toLowerCase())
      .digest("hex")
      .slice(0, 16);

    if (
      !timingSafeEqual(
        Uint8Array.from(Buffer.from(signature)),
        Uint8Array.from(Buffer.from(expectedSignature)),
      )
    ) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}
