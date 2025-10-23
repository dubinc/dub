const SECRET_KEY = process.env.TOKEN_HASH_SECRET;

/**
 * Simple SHA-256 implementation using Web Crypto API
 */
const simpleSHA256 = async (message: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const hashConfirmationCode = async (code: string | number): Promise<string> => {
  const codeString = code.toString();
  const timestamp = Date.now().toString();

  const payload = `${SECRET_KEY}:${codeString}:${timestamp}`;

  const hashedCode = await simpleSHA256(payload);

  return `${hashedCode}:${timestamp}`;
};

/**
 * Verify and decode a hashed confirmation code
 */
export const verifyConfirmationCode = async (
  hashedToken: string,
  providedCode: string | number,
  maxAgeMinutes: number = 5,
): Promise<boolean> => {
  try {
    const [hashedCode, timestamp] = hashedToken.split(':');

    if (!hashedCode || !timestamp) {
      return false;
    }

    // Check if token has expired
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds

    if (tokenAge > maxAge) {
      return false; // Token expired
    }

    // Recreate the original payload
    const payload = `${SECRET_KEY}:${providedCode.toString()}:${timestamp}`;

    // Create hash with the same method
    const expectedHash = await simpleSHA256(payload);

    // Compare hashes
    return hashedCode === expectedHash;
  } catch (error: any) {
    return error?.message;
  }
};

/**
 * Generate and hash a six-digit confirmation code
 */
export const generateHashedConfirmationCode = async (): Promise<{
  code: number;
  hashedToken: string;
}> => {
  const code = Math.floor(100000 + Math.random() * 900000);
  const hashedToken = await hashConfirmationCode(code);

  return {
    code,
    hashedToken,
  };
};
