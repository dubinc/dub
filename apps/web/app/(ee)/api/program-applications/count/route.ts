import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { countProgramApplications } from "@/lib/program-applications/count-program-applications";
import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import { NextResponse } from "next/server";

// GET /api/program-applications/count - get the count of applications for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { country, groupId, status, search, groupBy } =
      getProgramApplicationsCountQuerySchema.parse(searchParams);

    const programId = getDefaultProgramIdOrThrow(workspace);

    const count = await countProgramApplications({
      programId,
      groupId,
      country,
      status,
      search,
      groupBy,
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
