import { prisma } from "@dub/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  await prisma.installedIntegration.upsert({
    where: {
      userId_integrationId_projectId: {
        userId: "user_cludszk1h0000wmd2e0ea2b0p",
        integrationId: STRIPE_INTEGRATION_ID,
        projectId: "ws_1KETZ919F83ZJH6A80HWEHW6E",
      },
    },
    update: {
      settings: {
        stripeMode: "test",
      },
    },
    create: {
      userId: "user_cludszk1h0000wmd2e0ea2b0p",
      integrationId: STRIPE_INTEGRATION_ID,
      projectId: "ws_1KETZ919F83ZJH6A80HWEHW6E",
      settings: {
        stripeMode: "test",
      },
    },
  });
}

main();
