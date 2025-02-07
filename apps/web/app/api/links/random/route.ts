import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { getRandomKey } from "@/lib/planetscale";
import { domainKeySchema } from "@/lib/zod/schemas/links";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/links/random – get a random available link key for a given domain
export const GET = withWorkspace(async ({ req, workspace }) => {
  try {
    const searchParams = getSearchParams(req.url);
    const { domain } = domainKeySchema
      .pick({ domain: true })
      .parse(searchParams);

    const response = await getRandomKey({
      domain,
      long: domain === "loooooooo.ng",
    });
    return NextResponse.json(response);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
