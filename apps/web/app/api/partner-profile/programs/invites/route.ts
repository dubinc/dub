import { withPartnerProfile } from "@/lib/auth/partner";
import { PartnerProgramInviteSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/invites - get all invites for a given partnerId/email
export const GET = withPartnerProfile(async ({ session }) => {
  const invites = await prisma.programInvite.findMany({
    where: {
      email: session.user.email, // in the future we will check for invites for a given partnerId as well
    },
    include: {
      program: true,
    },
  });

  return NextResponse.json(z.array(PartnerProgramInviteSchema).parse(invites));
});
