import { withPartner } from "@/lib/auth/partner";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/dots-user – get Dots user info for a partner
export const GET = withPartner(async ({ partner }) => {
  const dotsUser = await retrieveDotsUser(partner);

  return NextResponse.json(dotsUser);
});
