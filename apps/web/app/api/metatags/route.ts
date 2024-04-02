import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getIdentityHash } from "@/lib/edge";
import { ratelimit } from "@/lib/upstash";
import { getUrlQuerySchema } from "@/lib/zod/schemas/links";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getMetaTags } from "./utils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { url } = getUrlQuerySchema.parse({
      url: req.nextUrl.searchParams.get("url"),
    });

    // Rate limit if user is not logged in
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session?.email) {
      const identity_hash = await getIdentityHash(req);
      const { success } = await ratelimit().limit(`metatags:${identity_hash}`);
      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message: "Don't DDoS me pls 🥺",
        });
      }
    }

    const metatags = await getMetaTags(url);
    return NextResponse.json(metatags, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
