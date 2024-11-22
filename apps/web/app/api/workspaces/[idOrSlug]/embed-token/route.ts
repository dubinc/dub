import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
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

  const token = await fetch(`${APP_DOMAIN_WITH_NGROK}/api/referrals/tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DUB_API_KEY}`,
    },
    body: JSON.stringify({ linkId: referralLinkId }),
  }).then((res) => res.json());

  return NextResponse.json(token);
});
