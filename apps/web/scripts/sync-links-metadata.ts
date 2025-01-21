import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const count = 16;
const limit = 20000;

async function main() {
  const links = await prisma.link.findMany({
    include: {
      tags: {
        select: {
          tag: true,
        },
      },
    },
    orderBy: [
      {
        clicks: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
    skip: 10000 + limit * count,
    take: limit,
  });

  //   const links = await prisma.domain
  //     .findMany({
  //       orderBy: [
  //         {
  //           clicks: "desc",
  //         },
  //         {
  //           createdAt: "asc",
  //         },
  //       ],
  //       take: 5000,
  //     })
  //     .then((domains) => {
  //       return domains.map((domain) => ({
  //         id: domain.id,
  //         domain: domain.slug,
  //         key: "_root",
  //         url: domain.target || "",
  //         tags: [] as { tagId: string }[],
  //         projectId: domain.projectId,
  //         createdAt: domain.createdAt,
  //       }));
  //     });

  const res = await recordLink(links);

  console.log(res);
}

main();
