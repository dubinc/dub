import { archiveDomain } from "@/lib/api/domains";
import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/domains/[domain]/archive – archive a domain
export const POST = withAuth(
  async ({ headers, domain }) => {
    const response = await archiveDomain({ domain, archived: true });
    return NextResponse.json(response, { headers });
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);

// DELETE /api/domains/[domain]/archive – unarchive a domain
export const DELETE = withAuth(
  async ({ headers, domain }) => {
    const response = await archiveDomain({ domain, archived: false });
    return NextResponse.json(response, { headers });
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);
