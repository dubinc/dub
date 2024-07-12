import { nanoid } from "ai";

export const generateCodeChallengeHash = async (codeVerifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64url = hashArray.map((byte) => String.fromCharCode(byte)).join("");
  const hashBase64 = Buffer.from(base64url, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return hashBase64;
};

export const createToken = ({
  prefix,
  length,
}: {
  prefix?: string;
  length: number;
}) => {
  return `${prefix || ""}${nanoid(length)}`;
};
