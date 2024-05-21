import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getRandomKey } from "@/lib/planetscale";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { getSearchParams } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// GET /api/links/random – get a random available link key for a given domain
export const GET = async (req: NextRequest) => {
  try {
    const searchParams = getSearchParams(req.url);
    const { domain } = domainKeySchema
      .pick({ domain: true })
      .parse(searchParams);

    await ratelimitOrThrow(req, "links-random");

    const response = await getRandomKey({
      domain,
      long: domain === "loooooooo.ng",
    });
    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
