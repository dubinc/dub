import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners/[partnerId]/programs - get all enrolled programs for a given partnerId
export const GET = withPartner(async ({ partner }) => {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: partner.id,
    },
    include: {
      program: true,
    },
  });

  return NextResponse.json(
    z.array(ProgramEnrollmentSchema).parse(
      programEnrollments.map((enrollment) => ({
        ...enrollment,
        link: null, // hacky way of not having to fetch link
      })),
    ),
  );
});
