// TODO:
// Check hashToken work as expected in all cases
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
export const hashToken = async (
  token: string,
  {
    noSecret = false,
  }: {
    noSecret?: boolean;
  } = {},
) => {
  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${token}${noSecret ? "" : process.env.NEXTAUTH_SECRET}`,
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
