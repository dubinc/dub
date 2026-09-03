import crypto from "crypto";

/**
 * Performs constant-time comparison of two strings to prevent timing attacks.
 * 
 * This function compares two strings in a way that takes the same amount of time
 * regardless of where the strings differ, mitigating timing side-channel attacks
 * (CWE-208).
 * 
 * Use this for comparing security-sensitive values like:
 * - Webhook signatures
 * - HMAC digests
 * - API keys
 * - Authentication tokens
 * 
 * @param provided - The value provided by the client/request
 * @param expected - The expected/computed value
 * @returns true if the strings match, false otherwise
 * 
 * @example
 * const signature = req.headers.get("x-signature");
 * const computedSignature = generateSignature(data);
 * if (!timingSafeCompare(signature, computedSignature)) {
 *   throw new Error("Invalid signature");
 * }
 */
export function timingSafeCompare(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (!provided) {
    return false;
  }

  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  // Length check before constant-time comparison
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Uint8Array.from(providedBuffer),
    Uint8Array.from(expectedBuffer),
  );
}
