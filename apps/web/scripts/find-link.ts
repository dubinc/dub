import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  // const linkWebhook = await prisma.linkWebhook.groupBy({
  //   by: ["webhookId"],
  //   _count: {
  //     linkId: true,
  //   },
  //   orderBy: {
  //     _count: {
  //       linkId: "desc",
  //     },
  //   },
  // });

  // console.table(linkWebhook);

  const linkFolders = await prisma.link.groupBy({
    by: ["folderId"],
    where: {
      webhooks: {
        some: {
          webhookId: "wh_1KVT5VFNB0NRA4YN3NWV3F6ZN",
        },
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  console.table(linkFolders);
}

main();
