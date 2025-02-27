import { withEmbedToken } from "@/lib/embed/auth";
import { NextResponse } from "next/server";

// GET /api/embed/token - get the embed token
export const GET = withEmbedToken(async ({ embedToken }) => {
  return NextResponse.json(embedToken);
});
