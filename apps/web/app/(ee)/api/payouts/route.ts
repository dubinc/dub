import { getPayouts } from "@/lib/api/payouts/get-payouts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/payouts - get all payouts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const filters = payoutsQuerySchema.parse(searchParams);

  const transformedPayouts = await getPayouts({
    workspaceId: workspace.id,
    programId,
    filters,
  });

  return NextResponse.json(
    z.array(PayoutResponseSchema).parse(transformedPayouts),
  );
});
