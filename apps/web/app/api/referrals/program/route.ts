import { withAuth } from "@/lib/referrals/auth";
import { ProgramSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// GET /api/referrals/program - get the program for the given affiliate
export const GET = withAuth(async ({ program }) => {
  return NextResponse.json(ProgramSchema.parse(program));
});
