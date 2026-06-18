import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { STRIPE_INTEGRATION_ID } from "@dub/utils";

async function main() {
  await prisma.installedIntegration.create({
    data: {
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
