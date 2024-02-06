import { withAuth } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/api/links";
import { NextResponse } from "next/server";
import { ErrorResponse, handleApiError } from "@/lib/errors";
import { DomainKeySchema } from "@/lib/zod";

// GET /api/links/exists – check if a link exists
export const GET = withAuth(
  async ({ headers, searchParams }) => {
    try {
      const { domain, key } = DomainKeySchema.parse(searchParams);
      const response = await checkIfKeyExists(domain, key);
      return NextResponse.json(response, {
        headers,
      });
    } catch (err) {
      const { error, status } = handleApiError(err);
      return NextResponse.json<ErrorResponse>({ error }, { headers, status });
    }
  },
  { skipLinkChecks: true },
);
