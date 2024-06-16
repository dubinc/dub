import { scopes } from "@/lib/api/api-keys/scopes";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET /api/tokens/scopes – return the available scopes for the token
export const GET = withWorkspace(async () => {
  return NextResponse.json(scopes);
});
