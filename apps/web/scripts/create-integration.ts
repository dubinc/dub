import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.create({
    data: {
      id: createId({ prefix: "int_" }),
      name: "Intercom",
      slug: "intercom",
      description: "Intercom integration",
      developer: "Dub",
      website: "https://dub.co",
      verified: true,
      projectId: DUB_WORKSPACE_ID,
      category: "Support",
    },
  });

  console.log(`${integration.name} integration created`, integration);
}

main();
