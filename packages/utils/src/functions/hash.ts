export async function generateMD5Hash(message: string) {
  // Convert the message string to a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Generate the hash using the SubtleCrypto interface
  const hashBuffer = await crypto.subtle.digest("MD5", data);

  // Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}
