import { randomBytes } from "crypto";

export const generateCodeChallengeHash = async (codeVerifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64url = hashArray.map((byte) => String.fromCharCode(byte)).join("");

  return Buffer.from(base64url, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const createToken = ({
  length,
  prefix,
}: {
  length: number;
  prefix?: string;
}) => {
  return `${prefix || ""}${randomBytes(length).toString("hex")}`;
};
