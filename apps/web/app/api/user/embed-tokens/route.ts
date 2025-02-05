import { withSession } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const dubPartnerId = session.user.dubPartnerId;

  if (!dubPartnerId) {
    return NextResponse.json({ publicToken: null }, { status: 200 });
  }

  const { publicToken } = await dub.embedTokens.create({
    programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
    partnerId: dubPartnerId,
  });

  return NextResponse.json({ publicToken });
});
