import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getIdentityHash } from "@/lib/edge";
import { ratelimit } from "@/lib/upstash";
import z from "@/lib/zod";
import { isValidUrl } from "@dub/utils";
import { NextRequest } from "next/server";
import { getMetaTags } from "./utils";

const getMetaTagQuerySchema = z.object({
  url: z.string().refine((v) => isValidUrl(v), { message: "Invalid URL" }),
});

export async function GET(req: NextRequest) {
  try {
    const { url } = getMetaTagQuerySchema.parse({
      url: req.nextUrl.searchParams.get("url"),
    });

    // Rate limit if user is not logged in
    const session = await auth();
    if (!session) {
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
    return new Response(JSON.stringify(metatags), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
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
