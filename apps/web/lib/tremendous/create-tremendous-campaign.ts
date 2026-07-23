import { logger, toErrorFields } from "@/lib/axiom/server";
import { prisma } from "@/lib/prisma";
import { Program } from "@prisma/client";
import { CampaignsApi, CreateCampaign200Response } from "tremendous";
import { tremendousConfiguration } from "./configuration";
import { TREMENDOUS_PRODUCT_IDS } from "./constants";

export async function createTremendousCampaign(
  program: Pick<Program, "id" | "tremendousCampaignId" | "name" | "logo">,
) {
  if (program.tremendousCampaignId) {
    return;
  }

  const campaignsApi = new CampaignsApi(tremendousConfiguration);

  try {
    const { data } = await campaignsApi.createCampaign({
      name: `${program.name} Partners`,
      description: `Earn gift cards for referring new partners to ${program.name}`,
      products: TREMENDOUS_PRODUCT_IDS,
      fee_charged_to: "RECIPIENT",
      webpage_style: {
        headline: `${program.name} sent you a {{ amount }} gift card`,
        logo_image_url: program.logo,
      },
    });

    const { campaign } = data as CreateCampaign200Response;

    await prisma.program.updateMany({
      where: {
        id: program.id,
        tremendousCampaignId: null,
      },
      data: {
        tremendousCampaignId: campaign.id,
      },
    });
  } catch (error) {
    logger.error("create_campaign_failed", {
      service: "tremendous",
      error: toErrorFields(error),
      correlation: {
        programId: program.id,
      },
    });

    await logger.flush();

    throw error;
  }
}
