import { logger, toErrorFields } from "@/lib/axiom/server";
import { prisma } from "@/lib/prisma";
import { fetchWithTimeout } from "@dub/utils";
import { Program } from "@prisma/client";
import { CampaignsApi, CreateCampaign200Response } from "tremendous";
import { tremendousConfiguration } from "./configuration";
import {
  TREMENDOUS_LOGO_CONTENT_TYPES,
  TREMENDOUS_PRODUCT_IDS,
} from "./constants";

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
        logo_image_url: await getTremendousLogoUrl(program.logo),
      },
    });

    const { campaign } = data as CreateCampaign200Response;

    const { count: updatedCount } = await prisma.program.updateMany({
      where: {
        id: program.id,
        tremendousCampaignId: null,
      },
      data: {
        tremendousCampaignId: campaign.id,
      },
    });

    // Log the orphan campaign for ops cleanup
    if (updatedCount === 0) {
      logger.error("create_campaign_orphaned", {
        service: "tremendous",
        campaignId: campaign.id,
        correlation: {
          programId: program.id,
        },
      });

      await logger.flush();
    } else {
      console.log(
        `[createTremendousCampaign] Updated the Tremendous campaign (${campaign.id}) for the program ${program.id}.`,
      );
    }
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

// Tremendous rejects WebP and AVIF logos, which programs can upload.
// For those, pass a PNG copy from wsrv.nl. Tremendous copies the image
// to its own storage, so it reads this URL only once.
async function getTremendousLogoUrl(logo: string | null) {
  if (!logo) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(logo, { method: "HEAD" });
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (contentType && TREMENDOUS_LOGO_CONTENT_TYPES.includes(contentType)) {
      return logo;
    }
  } catch (error) {
    console.error(
      `[getTremendousLogoUrl] Failed to read the content type of ${logo}`,
      error,
    );
  }

  const pngUrl = new URL("https://wsrv.nl");
  pngUrl.searchParams.set("url", logo);
  pngUrl.searchParams.set("output", "png");

  return pngUrl.toString();
}
