import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { dub } from "@/lib/dub";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/embed-token - create a new public embed token for the workspace
export const POST = withWorkspace(async ({ workspace }) => {
  const { referralLinkId } = workspace;

  if (!referralLinkId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Referral link not found for this workspace.",
    });
  }

  const token = await dub.embedTokens.create({
    linkId: referralLinkId,
  });

  return NextResponse.json(token);
});
