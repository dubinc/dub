import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const { publicToken } = await dub.embedTokens.referrals({
    tenantId: session.user.id,
    partner: {
      name: session.user.name || session.user.email,
      email: session.user.email,
      image: session.user.image || null,
      tenantId: session.user.id,
    },
  });

  return NextResponse.json({ publicToken });
});
