import { withWorkspace } from "@/lib/auth";
import { retrieveTransfers } from "@/lib/dots/retrieve-transfers";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/deposits – get deposits for a workspace
export const GET = withWorkspace(async ({ workspace }) => {
  const { dotsAppId } = workspace;

  if (!dotsAppId) {
    return NextResponse.json({ data: [], has_more: false });
  }

  return NextResponse.json(
    await retrieveTransfers({ dotsAppId, type: "refill" }),
  );
});
