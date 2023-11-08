import { withAuth } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/api/links";
import { NextResponse } from "next/server";

// GET /api//links/exists – check if a link exists
export const GET = withAuth(async ({ headers, searchParams }) => {
  const { domain, key } = searchParams;
  const response = await checkIfKeyExists(domain || "dub.sh", key);
  return NextResponse.json(response, {
    headers,
  });
});
