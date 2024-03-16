import { domainExists } from "@/lib/api/domains";
import { withSession } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/domains/[domain]/exists – check if a domain exists
export const GET = withSession(async ({ params }) => {
  const { domain } = params;
  const exists = await domainExists(domain);
  if (exists) {
    return NextResponse.json(1);
  } else {
    return NextResponse.json(0);
  }
});
