import { prisma } from "@dub/prisma";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../lib/api/links/cache";
import { encodeKeyIfCaseSensitive } from "../lib/api/links/case-sensitivity";

// script to convert existing links for a domain to case sensitive (encoded) setup
async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "domain.com",
    },
  });

  await Promise.all(
    links.map(async (link) => {
      const newKey = encodeKeyIfCaseSensitive({
        domain: link.domain,
        key: link.key,
      });

      const newLink = await prisma.link.update({
        where: { id: link.id },
        data: {
          key: newKey,
          shortLink: linkConstructorSimple({
            domain: link.domain,
            key: newKey,
          }),
        },
      });

      console.log(
        `Updated link ${link.id} from key ${link.key} to ${newLink.key} (shortLink: ${newLink.shortLink})`,
      );
    }),
  );

  const res = await linkCache.expireMany(links);
  console.log(res);
}

main();
