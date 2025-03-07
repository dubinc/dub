import { prisma } from "@dub/prisma";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { encodeKeyIfCaseSensitive } from "../../lib/api/links/case-sensitivity";

const domain = "buff.ly";
const userId = "user_EzRuKzR9sG3WmHapVV6aEec7";
const newFolderId = "fold_1JNQBVZV8P0NA0YGB11W2HHSQ";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      userId,
      domain,
      createdAt: {
        lte: new Date("2025-03-07"), // TODO: update this to the timestamp when the PR is merged
      },
    },
    take: 500,
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
        folderId: newFolderId,
      },
    });

    console.log(`Updated link ${link.id} to ${newShortLink}`);
  }

  // expire the Redis cache for the links so it fetches the latest version from the database
  await linkCache.expireMany(links);
}

main();
