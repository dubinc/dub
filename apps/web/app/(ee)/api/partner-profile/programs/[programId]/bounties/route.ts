import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { BountyWithSubmissionsSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/[programId]/bounties – get available bounties for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      startsAt: {
        lte: new Date(),
      },
      OR: [
        {
          endsAt: null,
        },
        {
          endsAt: {
            gt: new Date(),
          },
        },
      ],
    },
    include: {
      submissions: {
        where: {
          partnerId: partner.id,
        },
      },
    },
  });

  console.log(bounties)

  return NextResponse.json(
    z.array(BountyWithSubmissionsSchema).parse(bounties),
  );
});
