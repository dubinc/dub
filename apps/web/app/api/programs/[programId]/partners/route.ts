import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/partners - get all partners for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId: params.programId,
  });

  const partners = await prisma.partner.findMany({
    where: {
      programs: {
        some: {
          programId: program.id,
        },
      },
    },
  });

  return NextResponse.json(z.array(PartnerSchema).parse(partners));
});
