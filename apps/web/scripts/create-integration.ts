import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.create({
    data: {
      id: createId({ prefix: "int_" }),
      name: "Slack",
      slug: "slack",
      description: "Slack",
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
