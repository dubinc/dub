import { withSession } from "@/lib/auth";
import { domainExists } from "@/lib/api/domains";
import { NextResponse } from "next/server";

// GET /api/domains/[domain]/exists – check if a domain exists
export const GET = withSession(async ({ params }) => {
  const { domain } = params;

  // This is used for project creation only, if you add a domain within an existing project,
  // use the /api/projects/[slug]/domains/[domain]/exists endpoint instead
  const exists = await domainExists(domain);
  if (exists) {
    return NextResponse.json(1);
  } else {
    return NextResponse.json(0);
  }
});
