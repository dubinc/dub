import { getCommissionsCount } from "@/lib/api/commissions/get-commissions-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
import { NextResponse } from "next/server";

// GET /api/commissions/count
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const isHoldStatus = searchParams.status === "hold";
  const {
    status: _status,
    fraudEventGroupId,
    ...restSearchParams
  } = searchParams;

  const parsedParams = getCommissionsCountQuerySchema.parse(
    isHoldStatus ? restSearchParams : searchParams,
  );

  const counts = await getCommissionsCount({
    ...parsedParams,
    programId,
    isHoldStatus,
    ...(fraudEventGroupId && { fraudEventGroupId }),
  });

  return NextResponse.json(counts);
});
