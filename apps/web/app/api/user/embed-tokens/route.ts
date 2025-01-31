import { withSession } from "@/lib/auth";
import { API_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  // const { publicToken } = await dub.embedTokens.create({
  //   tenantId: session.user.id,
  // });
  const dubPartnerId = session.user.dubPartnerId;

  if (!dubPartnerId) {
    return NextResponse.json({ publicToken: null }, { status: 200 });
  }

  const { publicToken } = await fetch(`${API_DOMAIN}/tokens/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DUB_API_KEY}`,
    },
    body: JSON.stringify({
      programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
      partnerId: dubPartnerId,
    }),
  }).then((res) => res.json());

  return NextResponse.json({ publicToken });
});
