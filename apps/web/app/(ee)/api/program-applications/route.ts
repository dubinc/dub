import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { listProgramApplications } from "@/lib/program-applications/list-program-applications";
import {
  getPartnerApplicationsQuerySchema,
  PartnerApplicationSchema,
} from "@/lib/zod/schemas/program-application";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/program-applications - get all pending applications for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { country, groupId, status, search, sortOrder, page, pageSize } =
      getPartnerApplicationsQuerySchema.parse(searchParams);

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

    const response = z.array(PartnerApplicationSchema).parse(applications);

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
