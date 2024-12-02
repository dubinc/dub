import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/partners/[partnerId] - get a partner by id
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId, partnerId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partner: true,
    },
  });

  const partner = {
    ...programEnrollment.partner,
    ...programEnrollment,
    id: programEnrollment.partnerId,
  };

  return NextResponse.json(PartnerSchema.parse(partner));
});
