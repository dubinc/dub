import { SignJWT, jwtVerify } from "jose";
import pako from "pako";

const JWT_SECRET = `${process.env.JWT_SECRET || "super-secret-key"}`;
const secret = new TextEncoder().encode(JWT_SECRET);

// token encode
export const tokenEncode = async (payload: object): Promise<string> => {
  const compressedPayload = Buffer.from(
    pako.deflate(JSON.stringify(payload)),
  ).toString("base64");

  const jwt = await new SignJWT({ data: compressedPayload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret);

  return jwt;
};

export const tokenDecode = async <T>(token: string): Promise<T | null> => {
  try {
    const { payload } = await jwtVerify(token, secret);
    const data = payload.data as string;

    const buffer = Buffer.from(data, "base64");
    const uint8Array = new Uint8Array(buffer);
    const decompressedPayload = JSON.parse(
      pako.inflate(uint8Array, { to: "string" }),
    );

    return decompressedPayload as T;
  } catch {
    return null;
  }
};
