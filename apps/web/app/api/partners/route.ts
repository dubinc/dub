import { withSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerWithProgramsSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/partners - get all partners for the current user
export const GET = withSession(async ({ session }) => {
  const partners = await prisma.partner.findMany({
    where: {
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
      programs: {
        include: {
          program: true,
        },
      },
    },
  });
  return NextResponse.json(
    partners.map((partner) =>
      PartnerWithProgramsSchema.parse({
        ...partner,
        programs: partner.programs.map((p) => p.program),
      }),
    ),
  );
});
