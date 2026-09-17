import { listDiscounts } from "@/lib/api/discounts/list-discounts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  DiscountSchema,
  getDiscountsQuerySchema,
} from "@/lib/zod/schemas/discount";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const responseSchema = z.array(
  DiscountSchema.extend({
    groupId: z.string().nullable(),
    partnersCount: z.number(),
  }),
);

// GET /api/discounts - get all discounts for a program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);
  const { groupId } = getDiscountsQuerySchema.parse(searchParams);

  const discounts = await listDiscounts({
    programId,
    groupId,
  });

  return NextResponse.json(responseSchema.parse(discounts));
});
