import { getEligiblePayouts } from "@/lib/api/payouts/get-eligible-payouts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { eligiblePayoutsQuerySchema } from "@/lib/zod/schemas/payouts";
import { NextResponse } from "next/server";

/*
 * GET /api/programs/[programId]/payouts/eligible - get list of eligible payouts
 *
 * We're splitting this from /payouts because it's a special case that needs
 * to be handled differently:
 * - only include eligible payouts
 * - no pagination or filtering (we retrieve all pending payouts by default)
 * - sort by amount in descending order
 * - option to set a cutoff period to include commissions up to that date
 */

export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const query = eligiblePayoutsQuerySchema.parse(searchParams);

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const eligiblePayouts = await getEligiblePayouts({
    program,
    ...query,
  });

  return NextResponse.json(eligiblePayouts);
});
