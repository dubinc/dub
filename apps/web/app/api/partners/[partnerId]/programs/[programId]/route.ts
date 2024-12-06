import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId]/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartner(async ({ partner, params }) => {
  const { program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: partner.id,
        programId: program.id,
      },
    },
    include: {
      link: true,
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "You're not enrolled in this program",
    });
  }

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      program,
    }),
  );
});
