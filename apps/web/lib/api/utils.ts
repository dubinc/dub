import { ipAddress } from "@vercel/functions";
import { NextRequest } from "next/server";
import { getServerSession } from "../better-auth/get-session";
import { ratelimit } from "../upstash";
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
  const { session } = await getServerSession();

  // Rate limit if user is not logged in
  if (!session) {
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
