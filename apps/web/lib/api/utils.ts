import { ipAddress } from "@vercel/functions";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { assertRateLimit } from "../upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "../upstash/ratelimit-policies";
import { DubApiError } from "./errors";

// TODO move into `lib/api/utils/**` as individual files

export const parseRequestBody = async (req: Request) => {
  try {
    return await req.json();
  } catch (e) {
    console.error(e);
    throw new DubApiError({
      code: "bad_request",
      message:
        "Invalid JSON format in request body. Please ensure the request body is a valid JSON object.",
    });
  }
};

export const ratelimitOrThrow = async (
  req: NextRequest,
  identifier?: string,
) => {
  // Rate limit if user is not logged in
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session?.email) {
    const ip = ipAddress(req);
    await assertRateLimit({
      policy: RATELIMIT_POLICIES.anonymousIpRequest,
      identifier: [identifier || "ratelimit", ip ?? ""],
    });
  }
};
