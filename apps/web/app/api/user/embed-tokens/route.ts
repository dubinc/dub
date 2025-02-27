import { withSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  // const { publicToken } = await dub.embedTokens.create({
  //   programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
  //   partnerId: dubPartnerId,
  // });

  const { publicToken } = await fetch(
    "http://localhost:8888/api/tokens/embed",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DUB_API_KEY}`,
      },
      body: JSON.stringify({
        programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
        tenantId: session.user.id,
        partner: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      }),
    },
  ).then((res) => {
    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`);
    }
    return res.json();
  });

  console.log({ publicToken });

  return NextResponse.json({ publicToken });
});
