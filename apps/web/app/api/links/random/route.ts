import { getRandomKey } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/errors";
import { domainKeySchema } from "@/lib/zod";
import { NextResponse } from "next/server";

// GET /api/links/random – get a random available link key
export const GET = withAuth(async ({ headers, searchParams }) => {
  try {
    const { domain } = domainKeySchema
      .pick({ domain: true })
      .parse(searchParams);
    const response = await getRandomKey(domain);
    return NextResponse.json(response, {
      headers,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
