import { getCampaignOrThrow } from "@/lib/api/campaigns/get-campaign-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/campaigns/[campaignId]/send - send an email marketing campaign
export const POST = withWorkspace(
  async ({ workspace, params }) => {
    const { campaignId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const campaign = await getCampaignOrThrow({
      programId,
      campaignId,
    });

    if (campaign.type !== "marketing") {
      throw new DubApiError({
        code: "bad_request",
        message: "Only marketing campaigns can be sent.",
      });
    }

    // TODO:
    // call validateCampaign

    const notBefore = campaign.scheduledAt
      ? Math.floor(campaign.scheduledAt.getTime() / 1000)
      : null;

    await qstash.publish({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/${campaignId}/broadcast`,
      method: "POST",
      ...(notBefore && { notBefore }),
    });

    return NextResponse.json({}, { status: 204 });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    featureFlag: "emailCampaigns",
  },
);
