import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { ProgramInviteSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners/[partnerId]/programs/invites - get all invites for a given partnerId/email
export const GET = withPartner(async ({ session }) => {
  const invites = await prisma.programInvite.findMany({
    where: {
      email: session.user.email,
    },
    include: {
      program: true,
    },
  });

  return NextResponse.json(z.array(ProgramInviteSchema).parse(invites));
});
