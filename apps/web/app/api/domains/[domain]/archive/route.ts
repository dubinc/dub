import { archiveDomain } from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/archive – archive a domain
export const POST = withAuth(async ({ headers, domain }) => {
  console.log("archiving domain", domain);
  const response = await archiveDomain({ domain, archived: true });
  return NextResponse.json(response, { headers });
});

// DELETE /api/domains/[domain]/archive – unarchive a domain
export const DELETE = withAuth(async ({ headers, domain }) => {
  console.log("unarchiving domain", domain);
  const response = await archiveDomain({ domain, archived: false });
  return NextResponse.json(response, { headers });
});
