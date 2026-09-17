import {
  getDiscountsQuerySchema,
  listDiscounts,
  listDiscountsResponseSchema,
} from "@/lib/api/discounts/list-discounts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/discounts - get all discounts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { groupId } = getDiscountsQuerySchema.parse(searchParams);

  const discounts = await listDiscounts({
    programId,
    groupId,
  });

  return NextResponse.json(listDiscountsResponseSchema.parse(discounts));
});
