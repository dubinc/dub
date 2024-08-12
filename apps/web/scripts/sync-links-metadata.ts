import { prisma } from "@dub/prisma";
import { recordLink } from "@/lib/tinybird";
import "dotenv-flow/config";

const count = 16;
const limit = 20000;

async function main() {
  const links = await prisma.link.findMany({
    include: {
      tags: true,
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

  const res = await recordLink(
    links.map((link) => ({
      link_id: link.id,
      domain: link.domain,
      key: link.key,
      url: link.url,
      tag_ids: link.tags.map((tag) => tag.tagId),
      workspace_id: link.projectId,
      created_at: link.createdAt,
    })),
  );

  console.log(res);
}

main();
