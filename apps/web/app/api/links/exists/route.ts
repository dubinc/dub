import { checkIfKeyExists } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { domainKeySchema } from "@/lib/zod";
import { NextResponse } from "next/server";

// GET /api/links/exists – check if a link exists
export const GET = withAuth(
  async ({ headers, searchParams }) => {
    try {
      const { domain, key } = domainKeySchema.parse(searchParams);
      const response = await checkIfKeyExists(domain, key);
      return NextResponse.json(response, {
        headers,
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error, headers);
    }
  },
  { skipLinkChecks: true },
);
