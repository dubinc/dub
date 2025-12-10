// Encrypts and decrypts sensitive tokens for secure transmission through QStash
// Uses AES-GCM encryption with a key derived from environment variable

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

// Gets or derives the encryption key from environment variable
async function getEncryptionKey() {
  const secret =
    process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "";

  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET or NEXTAUTH_SECRET environment variable is required.",
    );
  }

  // Derive a key from the secret using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  const salt = new TextEncoder().encode("dub-token-encryption-salt");

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypts a token string
export async function encryptToken(token: string) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedToken = new TextEncoder().encode(token);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encodedToken,
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(IV_LENGTH + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), IV_LENGTH);

  // Convert to base64 for easy transmission
  return btoa(String.fromCharCode(...combined));
}

// Decrypts an encrypted token string
export async function decryptToken(encryptedToken: string) {
  const key = await getEncryptionKey();

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedToken), (c) =>
    c.charCodeAt(0),
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encryptedData,
  );

  return new TextDecoder().decode(decryptedData);
}
