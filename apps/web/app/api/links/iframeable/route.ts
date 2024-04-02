import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getIdentityHash } from "@/lib/edge";
import { ratelimit } from "@/lib/upstash";
import {
  getDomainQuerySchema,
  getUrlQuerySchema,
} from "@/lib/zod/schemas/links";
import { isIframeable } from "@dub/utils";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { url, domain } = getUrlQuerySchema.and(getDomainQuerySchema).parse({
      url: req.nextUrl.searchParams.get("url"),
      domain: req.nextUrl.searchParams.get("domain"),
    });

    // Rate limit if user is not logged in
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session?.email) {
      const identity_hash = await getIdentityHash(req);
      const { success } = await ratelimit().limit(
        `iframeable:${identity_hash}`,
      );
      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message: "Don't DDoS me pls 🥺",
        });
      }
    }

    const iframeable = await isIframeable({ url, requestDomain: domain });

    return NextResponse.json({ iframeable });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
