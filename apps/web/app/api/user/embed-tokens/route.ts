import { withSession } from "@/lib/auth";
import { API_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  // const { publicToken } = await dub.embedTokens.create({
  //   tenantId: session.user.id,
  // });

  const { publicToken } = await fetch(`${API_DOMAIN}/tokens/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DUB_API_KEY}`,
    },
    body: JSON.stringify({
      programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
      tenantId: session.user.id,
    }),
  }).then((res) => res.json());

  return NextResponse.json({ publicToken });
});
