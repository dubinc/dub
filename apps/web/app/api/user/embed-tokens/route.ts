import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const referralLinkId = session.user.referralLinkId;

  if (!referralLinkId) {
    return NextResponse.json({ publicToken: null }, { status: 200 });
  }

  const { publicToken } = await dub.embedTokens.create({
    linkId: referralLinkId,
  });

  return NextResponse.json({ publicToken });
});
