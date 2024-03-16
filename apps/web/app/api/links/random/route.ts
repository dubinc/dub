import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getIdentityHash } from "@/lib/edge";
import { getRandomKey } from "@/lib/planetscale";
import { ratelimit } from "@/lib/upstash";
import { domainKeySchema } from "@/lib/zod";
import { getSearchParams } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

// GET /api/links/random – get a random available link key for a given domain
export const GET = async (req: NextRequest) => {
  try {
    const searchParams = getSearchParams(req.url);
    const { domain } = domainKeySchema
      .pick({ domain: true })
      .parse(searchParams);

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

    const response = await getRandomKey(domain);
    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
