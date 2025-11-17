import { getEligiblePayoutsCount } from "@/lib/api/payouts/get-eligible-payouts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { eligiblePayoutsCountQuerySchema } from "@/lib/zod/schemas/payouts";
import { NextResponse } from "next/server";

/*
 * GET /api/programs/[programId]/payouts/eligible/count - get count of eligible payouts
 */
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const query = eligiblePayoutsCountQuerySchema.parse(searchParams);

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  return NextResponse.json(
    await getEligiblePayoutsCount({
      program,
      ...query,
    }),
  );
});
