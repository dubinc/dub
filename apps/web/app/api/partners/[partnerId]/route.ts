import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/[partnerId] - get a partner by id
export const GET = withWorkspace(
  async ({ workspace, searchParams, params }) => {
    const { programId } = searchParams;
    const { partnerId } = params;

    if (!programId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Program ID not found. Did you forget to include a `programId` query parameter?",
      });
    }

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
  },
);
