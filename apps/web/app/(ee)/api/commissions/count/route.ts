import { getCommissionsCount } from "@/lib/api/commissions/get-commissions-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/commissions/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const parsedParams = getCommissionsCountQuerySchema
    .extend({
      fraudEventGroupId: z.string().optional(),
    })
    .parse(searchParams);

  const counts = await getCommissionsCount({
    ...parsedParams,
    programId,
  });

  return NextResponse.json(counts);
});
