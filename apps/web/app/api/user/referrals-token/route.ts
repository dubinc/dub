import { withSession } from "@/lib/auth";
import { createReferralsEmbedTokenSchema } from "@/lib/zod/schemas/token";
import { API_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = withSession(async ({ session }) => {
  // const { publicToken } = await dub.embedTokens.create({
  //   programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
  //   partnerId: dubPartnerId,
  // });

  const partnerProps: z.infer<typeof createReferralsEmbedTokenSchema> = {
    programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
    tenantId: session.user.id,
    partner: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image || null,
      tenantId: session.user.id,
    },
  };

  const { publicToken } = await fetch(`${API_DOMAIN}/tokens/embed/referrals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DUB_API_KEY}`,
    },
    body: JSON.stringify(partnerProps),
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`);
    }
    return res.json();
  });

  return NextResponse.json({ publicToken });
});
