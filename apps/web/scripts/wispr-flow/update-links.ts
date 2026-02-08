import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";

// update links
async function main() {
  const url = undefined;
  if (!url) {
    console.log("No url provided");
    return;
  }

  const links = await prisma.link.findMany({
    where: {
      folderId: "fold_mslj7fMwqZPIFJqPQIoenL8H",
      ios: {
        not: url,
      },
    },
    take: 100,
  });

  const updatedLinks = await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: {
      ios: url,
    },
  });

  console.log(updatedLinks);

  const res = await linkCache.expireMany(links);

  console.log(res);
}

main();
