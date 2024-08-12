import { prisma } from "@/lib/prisma";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const integration = await prisma.integration.create({
    data: {
      name: "Stripe",
      slug: "stripe",
      description:
        "Connect your Stripe account to set up conversion tracking and understand how your clicks are converting to sales.",
      developer: "Dub",
      website: "https://dub.co",
      verified: true,
      projectId: DUB_WORKSPACE_ID,

      screenshots: [],
      userId: "",
      logo: "",
      readme: "",
    },
  });

  console.log(`${integration.name} integration created`, integration);
}

main();
