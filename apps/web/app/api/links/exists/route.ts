import { withAuth } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/api/links";
import { NextResponse } from "next/server";

// GET /api//links/exists – check if a link exists
export const GET = withAuth(
  async ({ headers, searchParams }) => {
    const { domain, key } = searchParams;
    if (!domain || !key) {
      return new Response("Missing domain or key", { status: 400 });
    }
    const response = await checkIfKeyExists(domain, key);
    return NextResponse.json(response, {
      headers,
    });
  },
  { skipLinkChecks: true },
);
