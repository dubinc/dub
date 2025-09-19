import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.create({
    data: {
      id: createId({ prefix: "int_" }),
      name: "HubSpot",
      slug: "hubspot",
      description: "Track HubSpot events with Dub.",
      developer: "Dub",
      website: "https://dub.co",
      verified: true,
      projectId: DUB_WORKSPACE_ID,
      category: "",
      guideUrl: "",
    },
  });

  console.log(`${integration.name} integration created`, integration);
}

main();
