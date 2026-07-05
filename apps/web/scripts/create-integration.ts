import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID, GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.upsert({
    where: {
      slug: "google-ads",
    },
    create: {
      id: GOOGLE_ADS_INTEGRATION_ID,
      name: "Google Ads",
      slug: "google-ads",
      description:
        "Connect your Google Ads account to upload offline conversions from Dub.",
      developer: "Dub",
      website: "https://dub.co",
      verified: true,
      projectId: DUB_WORKSPACE_ID,
      category: "Analytics",
    },
    update: {},
  });

  console.log(`${integration.name} integration created`, integration);
}

main();
