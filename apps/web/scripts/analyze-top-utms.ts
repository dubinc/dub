import { prisma } from "@/lib/prisma";
import { truncate } from "@dub/utils";
import "dotenv-flow/config";

const utmTag = "utm_campaign";

async function main() {
  const utms = await prisma.link.groupBy({
    where: {
      [utmTag]: {
        not: null,
      },
    },
    by: [utmTag],
    _count: {
      [utmTag]: true,
    },
    take: 100,
    orderBy: {
      _count: {
        [utmTag]: "desc",
      },
    },
  });

  console.table(
    utms.map((utm) => ({
      [utmTag]: truncate(utm[utmTag], 24),
      count: utm._count[utmTag],
    })),
  );
}

main();
