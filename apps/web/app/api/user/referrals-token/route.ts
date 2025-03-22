import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const { publicToken } = await dub.embedTokens.referrals({
    programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
    tenantId: session.user.id,
    partner: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image || null,
      tenantId: session.user.id,
    },
  });

  return NextResponse.json({ publicToken });
});
