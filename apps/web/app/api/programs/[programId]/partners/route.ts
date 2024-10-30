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
    const { status, offset, limit } = searchSchema.parse(searchParams);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: params.programId,
    });

    const partners = await prisma.partner.findMany({
      where: {
        programs: {
          some: {
            programId: program.id,
            ...(status && { status }),
          },
        },
      },
      skip: offset,
      take: limit,
    });

    return NextResponse.json(z.array(PartnerSchema).parse(partners));
  },
);
