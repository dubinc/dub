import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { listProgramApplications } from "@/lib/program-applications/list-program-applications";
import {
  getProgramApplicationsQuerySchema,
  ProgramApplicationSchema,
} from "@/lib/zod/schemas/program-application";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/program-applications - get all applications for a program, filtered by status
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { country, groupId, status, search, sortOrder, page, pageSize } =
      getProgramApplicationsQuerySchema.parse(searchParams);

    const programId = getDefaultProgramIdOrThrow(workspace);

    const applications = await listProgramApplications({
      programId,
      groupId,
      country,
      status,
      search,
      sortOrder,
      page,
      pageSize,
    });

    const response = z.array(ProgramApplicationSchema).parse(applications);

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
