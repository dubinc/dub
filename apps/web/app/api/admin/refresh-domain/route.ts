import { addDomainToVercel, removeDomainFromVercel } from "@/lib/api/domains";
import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/admin/refresh-domain
export const POST = withAdmin(async ({ req }) => {
  const { domain } = await req.json();

  const remove = await removeDomainFromVercel(domain);
  const add = await addDomainToVercel(domain);

  console.log({ remove, add });

  return NextResponse.json({ success: true });
});
