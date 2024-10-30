import { DubApiError } from "@/lib/api/errors";
import { withPartner } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/partners";
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
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "You're not enrolled in this program",
    });
  }

  console.log(programEnrollment);

  const response = ProgramEnrollmentSchema.parse(programEnrollment);
  console.log({ response });

  return NextResponse.json(response);
});
