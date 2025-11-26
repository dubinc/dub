import { LOCALHOST_IP, hashStringSHA256 } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { userAgent } from "next/server";
import { DUB_TEST_IDENTITY_HEADER } from "tests/utils/resource";

/**
 * Combine IP + UA to create a unique identifier for the user (for deduplication)
 */
export async function getIdentityHash(req: Request) {
  // If provided, use this identity directly (for E2E)
  if (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "development"
  ) {
    const testOverride = req.headers.get(DUB_TEST_IDENTITY_HEADER);

    if (testOverride) {
      return await hashStringSHA256(testOverride);
    }
  }

  const ip = ipAddress(req) || LOCALHOST_IP;
  const ua = userAgent(req);
  return await hashStringSHA256(`${ip}-${ua.ua}`);
}
