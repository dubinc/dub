import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import { encodeKeyIfCaseSensitive } from "../lib/api/links/case-sensitivity";

// script to convert existing links for a domain to case sensitive (encoded) setup
async function main() {
  const where: Prisma.LinkWhereInput = {
    domain: "domain.com",
    createdAt: {
      lt: new Date("2025-06-30T23:59:59.999Z"),
    },
    NOT: {
      key: {
        endsWith: "=",
      },
    },
  };

  const links = await prisma.link.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const remainingLinks = await prisma.link.count({
    where,
    skip: 100,
  });

  console.log(`Remaining links: ${remainingLinks}`);

  await Promise.all(
    links.map(async (link) => {
      if (link.key.length > 7) {
        console.log(
          `Skipping link ${link.id} because key length is greater than 7 (already encoded)`,
        );
        return;
      }

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
