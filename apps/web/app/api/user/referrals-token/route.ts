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
      groupId: "grp_1K2QJWRQ917XX2YR5VHQ1RRC5", // User Referrals group
    },
  });

  return NextResponse.json({ publicToken });
});
