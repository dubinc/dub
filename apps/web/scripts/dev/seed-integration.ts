import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { ACME_WORKSPACE_ID } from "@dub/utils";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils/src";
import "dotenv-flow/config";

async function main() {
  await prisma.installedIntegration.upsert({
    where: {
      userId_integrationId_projectId: {
        userId: "cl7p1s07k000687rbuhpwqkqa",
        integrationId: INTERCOM_INTEGRATION_ID,
        projectId: ACME_WORKSPACE_ID,
      },
    },
    create: {
      userId: "cl7p1s07k000687rbuhpwqkqa",
      integrationId: INTERCOM_INTEGRATION_ID,
      projectId: ACME_WORKSPACE_ID,
      credentials: {
        appId: "xxx",
        accessToken: encrypt("xxx"),
      },
    },
    update: {
      //
    },
  });
}

main();
