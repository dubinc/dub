import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.create({
    data: {
      name: "Slack",
      slug: "slack",
      description: "Create links from Slack messages easily with Dub.",
      developer: "Dub",
      website: "https://dub.co",
      verified: true,
      projectId: DUB_WORKSPACE_ID,

      // screenshots: [],
      // userId: "",
      // logo: "",
      // readme: "",
    },
  });

  console.log(`${integration.name} integration created`, integration);
}

main();
