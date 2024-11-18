import { parseRequestBody } from "@/lib/api/utils";
import { requestPartnerInviteSchema } from "@/lib/dots/schemas";
import { withAuth } from "@/lib/referrals/auth";
import { NextResponse } from "next/server";

// POST /api/referrals/invite - invite a partner to dub partners
export const POST = withAuth(async ({ req }) => {
  const { email } = requestPartnerInviteSchema.parse(
    await parseRequestBody(req),
  );

  // TODO: Invite the partner to program

  return NextResponse.json({});
});
