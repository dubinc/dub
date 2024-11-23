import { DubApiError } from "@/lib/api/errors";
import { withPartner } from "@/lib/auth/partner";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartner(async ({ partner, params }) => {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: params.programId,
      },
    },
    include: {
      link: true,
      program: true,
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "You're not enrolled in this program",
    });
  }

  return NextResponse.json(ProgramEnrollmentSchema.parse(programEnrollment));
});
