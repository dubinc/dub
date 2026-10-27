import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils/src/constants/integrations";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.upsert({
    where: {
      id: GOOGLE_ADS_INTEGRATION_ID,
    },
    create: {
      id: GOOGLE_ADS_INTEGRATION_ID,
      name: "Google Ads",
      slug: "google-ads",
      description:
        "Upload offline click conversions to Google Ads to optimize ad performance.",
      developer: "Dub",
      website: "https://ads.google.com",
      verified: true,
      projectId: DUB_WORKSPACE_ID,
      category: "Analytics",
    },
    update: {
      name: "Google Ads",
      slug: "google-ads",
      description:
        "Upload offline click conversions to Google Ads to optimize ad performance.",
      verified: true,
      category: "Analytics",
    },
  });

  console.log(`${integration.name} integration created`, integration);
}

main();
