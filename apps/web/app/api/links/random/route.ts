import { withAuth } from "@/lib/auth";
import { getRandomKey } from "@/lib/api/links";
import { NextResponse } from "next/server";

// GET /api/links/random – get a random available link key
export const GET = withAuth(async ({ headers, searchParams }) => {
  const { domain } = searchParams;
  const response = await getRandomKey(domain || "dub.sh");
  return NextResponse.json(response, {
    headers,
  });
});
