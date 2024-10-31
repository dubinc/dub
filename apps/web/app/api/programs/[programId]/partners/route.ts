import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const searchSchema = z.object({
  status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
  offset: z.number().optional().default(0),
  limit: z.number().optional().default(50),
});

// GET /api/programs/[programId]/partners - get all partners for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { status, offset, limit } = searchSchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        ...(status && { status }),
      },
      include: {
        partner: true,
      },
      skip: offset,
      take: limit,
    });

    const partners = programEnrollments.map((enrollment) => ({
      ...enrollment.partner,
      ...enrollment,
      id: enrollment.partnerId,
    }));

    return NextResponse.json(z.array(PartnerSchema).parse(partners));
  },
);
