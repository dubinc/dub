import { encodeKeyIfCaseSensitive } from "@/lib/api/case-sensitive-short-links";
import { prisma } from "@dub/prisma";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";

const flatRatePartners: string[] = [];

const domain = "buff.ly";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain,
      
      // TODO:
      // Fetch the links created using the Dub API
    },
    take: 0,
    skip: 0,
  });

  if (!links.length) {
    console.log("No more links to migrate.");
    return;
  }

  for (const link of links) {
    const newKey = encodeKeyIfCaseSensitive({
      domain,
      key: link.key,
    });

    const newShortLink = linkConstructorSimple({
      domain,
      key: newKey,
    });

    await prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        key: newKey,
        shortLink: newShortLink,
      },
    });

    console.log(`Updated link ${link.id} to ${newShortLink}`);
  }
}

main();
