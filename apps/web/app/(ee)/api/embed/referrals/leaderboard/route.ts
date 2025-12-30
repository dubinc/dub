import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { generateRandomName } from "@/lib/names";
import { LeaderboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { OG_AVATAR_URL } from "@dub/utils";
import { NextResponse } from "next/server";
import z from "node_modules/zod/lib";

// GET /api/embed/referrals/leaderboard – get leaderboard for a program
export const GET = withReferralsEmbedToken(async ({ program }) => {
  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      status: "approved",
      totalCommissions: {
        gt: 0,
      },
    },
    orderBy: {
      totalCommissions: "desc",
    },
    take: 100,
  });

  const response = partners.map((partner) => ({
    id: partner.id,
    name: generateRandomName(partner.id),
    image: `${OG_AVATAR_URL}${partner.id}`,
    totalCommissions: Number(partner.totalCommissions),
  }));

  // if less than 20, append some dummy data
  if (response.length < 20) {
    response.push(
      ...Array.from({ length: 20 - response.length }).map((_, index) => {
        const randomName = generateRandomName(index.toString());
        return {
          id: randomName,
          name: randomName,
          image: `${OG_AVATAR_URL}${randomName}`,
          totalCommissions: 0,
        };
      }),
    );
  }

  return NextResponse.json(z.array(LeaderboardPartnerSchema).parse(response));
});
