import { withAuth } from "@/lib/auth";
import { domainExists } from "@/lib/api/domains";
import { NextResponse } from "next/server";

// GET /api/projects/[slug]/domains/[domain]/exists – check if a domain exists
export const GET = withAuth(async ({ domain, project }) => {
  const exists = await domainExists(domain);
  if (exists) {
    return NextResponse.json(1);
  } else {
    return NextResponse.json(0);
  }
});
