import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProgramApplicationWhere } from "@/lib/program-applications/program-application-where";
import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import { NextResponse } from "next/server";

// GET /api/program-applications/count - get the count of applications for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { country, groupId, status, search } =
      getProgramApplicationsCountQuerySchema.parse(searchParams);

    const programId = getDefaultProgramIdOrThrow(workspace);

    const where = buildProgramApplicationWhere({
      programId,
      groupId,
      country,
      status,
      search,
    });

    const count = await prisma.programApplication.count({
      where,
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
