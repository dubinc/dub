import { resourcePermissions } from "@/lib/api/tokens/scopes";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/tokens/scopes – returns a list of all resource scopes
export const GET = withWorkspace(async () => {
  return NextResponse.json(resourcePermissions);
});
