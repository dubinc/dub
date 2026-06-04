import { prisma } from "@dub/prisma";
import { ACME_WORKSPACE_ID, STRIPE_INTEGRATION_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  await prisma.installedIntegration.upsert({
    where: {
      userId_integrationId_projectId: {
        userId: "user_cludszk1h0000wmd2e0ea2b0p",
        integrationId: STRIPE_INTEGRATION_ID,
        projectId: ACME_WORKSPACE_ID,
      },
    },
    create: {
      userId: "user_cludszk1h0000wmd2e0ea2b0p",
      integrationId: STRIPE_INTEGRATION_ID,
      projectId: ACME_WORKSPACE_ID,
      settings: {
        stripeMode: "sandbox",
      },
    },
    update: {
      //
    },
  });
}

main();
