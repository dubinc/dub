import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const oAuthApps = await prisma.oAuthApp.findMany({
    select: {
      name: true,
      slug: true,
      description: true,
      readme: true,
      developer: true,
      website: true,
      logo: true,
      screenshots: true,
      userId: true,
      projectId: true,
      verified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  for (const oAuthApp of oAuthApps) {
    const data = {
      ...oAuthApp,
      screenshots: oAuthApp.screenshots ? oAuthApp.screenshots : [],
    };

    // Create the integration
    // @ts-ignore
    const integration = await prisma.integration.create({ data });

    // Update the oAuthApp with the new integrationId
    await prisma.oAuthApp.update({
      // @ts-ignore
      where: { slug: oAuthApp.slug },
      data: { integrationId: integration.id },
    });
  }

  console.log("Migrated integrations");
}

main();
