import { ipAddress } from "@vercel/edge";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { ratelimit } from "../upstash";
import { DubApiError } from "./errors";

// TODO:
// Move this to a proper place
export const parseRequestBody = async (req: Request) => {
  try {
    return await req.json();
  } catch (e) {
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
    const { success } = await ratelimit().limit(
      `${identifier || "ratelimit"}:${ip}`,
    );
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }
  }
};
