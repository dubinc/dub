import { invitePartner } from "@/lib/api/partners/invite-partner";
import { parseRequestBody } from "@/lib/api/utils";
import { requestPartnerInviteSchema } from "@/lib/dots/schemas";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/referrals/auth";
import { NextResponse } from "next/server";

// GET /api/referrals/invite - check if a partner is already invited to a program
export const GET = withAuth(async ({ link, program }) => {
  const [programEnrollment, programInvite] = await Promise.all([
    prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
        linkId: link.id,
      },
    }),

    prisma.programInvite.findFirst({
      where: {
        programId: program.id,
        linkId: link.id,
      },
    }),
  ]);

  return NextResponse.json({
    programEnrollment,
    programInvite,
  });
});

// POST /api/referrals/invite - invite a partner to dub partners
export const POST = withAuth(async ({ req, link, program, workspace }) => {
  const { email } = requestPartnerInviteSchema.parse(
    await parseRequestBody(req),
  );

  const programInvited = await invitePartner({
    email,
    program,
    link,
    workspace,
  });

  return NextResponse.json(programInvited);
});
