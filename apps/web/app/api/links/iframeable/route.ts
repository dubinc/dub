import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import {
  getDomainQuerySchema,
  getUrlQuerySchema,
} from "@/lib/zod/schemas/links";
import { isIframeable } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { url, domain } = getUrlQuerySchema.and(getDomainQuerySchema).parse({
      url: req.nextUrl.searchParams.get("url"),
      domain: req.nextUrl.searchParams.get("domain"),
    });

    await ratelimitOrThrow(req, "iframeable");

    const iframeable = await isIframeable({ url, requestDomain: domain });

    return NextResponse.json({ iframeable });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
