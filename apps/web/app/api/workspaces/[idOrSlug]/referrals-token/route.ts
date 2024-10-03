import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { createPublicToken } from "@/lib/referrals/token";
import { referralTokenSchema } from "@/lib/zod/schemas/referrals";
import { NextResponse } from "next/server";

// GET /api/workspaces/[idOrSlug]/referrals-token - create a new referral token for the workspace
export const POST = withWorkspace(async ({ workspace }) => {
  const { referralLinkId, id } = workspace;

  if (!referralLinkId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Referral link not found for this workspace.",
    });
  }

  const token = await createPublicToken({
    linkId: referralLinkId,
    workspaceId: id,
  });

  return NextResponse.json(referralTokenSchema.parse(token), {
    status: 201,
  });
});
