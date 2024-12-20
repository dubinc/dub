import { prisma } from "@dub/prisma";
import { LEGAL_USER_ID, LEGAL_WORKSPACE_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.updateMany({
    where: {
      domain: "dub.sh",
      url: {
        contains: "secure329.inmotionhosting.com",
      },
    },
    // select: {
    //   shortLink: true,
    //   url: true,
    //   projectId: true,
    //   userId: true,
    // },
    data: {
      projectId: LEGAL_WORKSPACE_ID,
      userId: LEGAL_USER_ID,
    },
  });
  console.table(links);
}

main();
