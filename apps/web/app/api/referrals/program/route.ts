import { withEmbedToken } from "@/lib/referrals/auth";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/referrals/program - get the program for the given affiliate
export const GET = withEmbedToken(async ({ program }) => {
  return NextResponse.json(ProgramSchema.parse(program));
});
