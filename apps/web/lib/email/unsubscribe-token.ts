import { APP_DOMAIN } from "@dub/utils";
import { createHmac } from "crypto";

const UNSUBSCRIBE_TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "secret";

/**
 * Generate a secure unsubscribe token for an email address.
 * The token is a combination of the email and a signature that can be verified.
 */
export function generateUnsubscribeToken(email: string): string {
  const signature = createHmac("sha256", UNSUBSCRIBE_TOKEN_SECRET)
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

    // Verify the signature
    const expectedSignature = createHmac("sha256", UNSUBSCRIBE_TOKEN_SECRET)
      .update(email.toLowerCase())
      .digest("hex")
      .slice(0, 16);

    if (signature !== expectedSignature) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}

/**
 * Generate an unsubscribe URL for an email address.
 */
export function generateUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${APP_DOMAIN}/unsubscribe/${token}`;
}
