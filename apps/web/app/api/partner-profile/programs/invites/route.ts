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

  // no need to consider the partner-specific rewards here, as the invite is still pending there is no programEnrollment
  const [programWideRewards, programWideDiscounts] = await Promise.all([
    prisma.reward.findMany({
      where: {
        id: {
          in: invites
            .map((invite) => invite.program.defaultRewardId)
            .filter((id): id is string => id !== null),
        },
      },
    }),

    prisma.discount.findMany({
      where: {
        id: {
          in: invites
            .map((invite) => invite.program.defaultDiscountId)
            .filter((id): id is string => id !== null),
        },
      },
    }),
  ]);

  const programInvites = invites.map((invite) => ({
    ...invite,
    reward:
      programWideRewards.find(
        (reward) => reward.id === invite.program.defaultRewardId,
      ) ?? null,
    discount:
      programWideDiscounts.find(
        (discount) => discount.id === invite.program.defaultDiscountId,
      ) ?? null,
  }));

  return NextResponse.json(
    z.array(PartnerProgramInviteSchema).parse(programInvites),
  );
});
