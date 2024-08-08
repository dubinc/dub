import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  // Step 1: Migrate OAuthApps to Integrations
  // const oAuthApps = await prisma.oAuthApp.findMany({
  //   select: {
  //     id: true,
  //     name: true,
  //     slug: true,
  //     description: true,
  //     readme: true,
  //     developer: true,
  //     website: true,
  //     logo: true,
  //     screenshots: true,
  //     userId: true,
  //     projectId: true,
  //     verified: true,
  //     createdAt: true,
  //     updatedAt: true,
  //   },
  // });

  // for (const oAuthApp of oAuthApps) {
  //   const data = {
  //     ...oAuthApp,
  //     screenshots: oAuthApp.screenshots ? oAuthApp.screenshots : [],
  //   };

  //   const integration = await prisma.integration.create({ data });

  //   await prisma.oAuthApp.update({
  //     where: { slug: oAuthApp.slug },
  //     data: { integrationId: integration.id },
  //   });
  // }

  // ----------------------------

  // Step 2: Migrate OAuthAuthorizedApp to InstalledIntegration
  const authorizedApps = await prisma.oAuthAuthorizedApp.findMany({
    select: {
      id: true,
      userId: true,
      clientId: true,
      projectId: true,
      createdAt: true,
      oAuthApp: {
        select: {
          integration: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  for (const authorizedApp of authorizedApps) {
    if (!authorizedApp.oAuthApp.integration) {
      console.log(
        `Integration not found for authorized app ${authorizedApp.id}`,
      );
      continue;
    }

    await prisma.installedIntegration.create({
      data: {
        id: authorizedApp.id,
        integrationId: authorizedApp.oAuthApp.integration.id,
        projectId: authorizedApp.projectId,
        userId: authorizedApp.userId,
        createdAt: authorizedApp.createdAt,
        updatedAt: authorizedApp.createdAt,
      },
    });
  }
}

main();
