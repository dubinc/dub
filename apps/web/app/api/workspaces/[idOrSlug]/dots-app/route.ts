import { withWorkspace } from "@/lib/auth";
import { retrieveDotsApp } from "@/lib/dots/retrieve-dots-app";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/dots-app – get Dots app for a workspace
export const GET = withWorkspace(async ({ workspace, session }) => {
  const { dotsAppId } = workspace;

  if (!dotsAppId) {
    return NextResponse.json(null);
  }

  return NextResponse.json(await retrieveDotsApp({ dotsAppId }));
});
