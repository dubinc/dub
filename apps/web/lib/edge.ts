import { LOCALHOST_IP, hashStringSHA256 } from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { userAgent } from "next/server";

/**
 * Combine IP + UA to create a unique identifier for the user (for deduplication)
 */
export async function getIdentityHash(req: Request) {
  const ip = ipAddress(req) || LOCALHOST_IP;
  console.log(ip);
  const ua = userAgent(req);
  const hash = await hashStringSHA256(`${ip}-${ua.ua}`);
  console.log(hash);
  return hash;
}
