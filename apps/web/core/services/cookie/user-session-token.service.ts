import jwt from "jsonwebtoken";
import zlib from "zlib";

const JWT_SECRET = `${process.env.NEXT_PUBLIC_JWT_SECRET || "super-secret-key"}`;

// token encode
export const tokenEncode = (payload: object): string => {
  const compressedPayload = zlib
    .deflateSync(JSON.stringify(payload))
    .toString("base64");
  return jwt.sign({ data: compressedPayload }, JWT_SECRET);
};

export const tokenDecode = <T>(token: string): T | null => {
  try {
    const { data } = jwt.verify(token, JWT_SECRET) as { data: string };

    try {
      const decompressedPayload = JSON.parse(
        zlib.inflateSync(Buffer.from(data, "base64")).toString(),
      );

      return decompressedPayload as T;
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        "Token is in old format, attempting to decode as standard JWT",
      );
      return JSON.parse(data) as T;
    }
  } catch {
    try {
      return jwt.verify(token, JWT_SECRET) as T;
    } catch {
      return null;
    }
  }
};
