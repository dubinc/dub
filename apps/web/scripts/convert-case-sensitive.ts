import { prisma } from "@dub/prisma";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import { encodeKeyIfCaseSensitive } from "../lib/api/links/case-sensitivity";

// script to convert existing links for a domain to case sensitive (encoded) setup
async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "domain.com",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
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
}

main();
