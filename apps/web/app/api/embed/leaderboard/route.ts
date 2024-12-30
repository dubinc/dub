import { withEmbedToken } from "@/lib/embed/auth";
import { LeaderboardPartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import z from "node_modules/zod/lib";

// GET /api/embed/sales – get sales for a link from an embed token
export const GET = withEmbedToken(async ({ program, searchParams }) => {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
    },
    orderBy: [
      {
        link: {
          saleAmount: "desc",
        },
      },
      {
        link: {
          leads: "desc",
        },
      },
      {
        link: {
          clicks: "desc",
        },
      },
    ],
    select: {
      partner: true,
      link: true,
    },
    take: 20,
  });

  return NextResponse.json(
    z.array(LeaderboardPartnerSchema).parse(programEnrollments),
  );
});
