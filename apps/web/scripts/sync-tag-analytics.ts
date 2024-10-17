import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      tags: {
        some: {},
      },
    },
    include: {
      tags: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    skip: 0,
    take: 1000,
  });

  const res = await recordLink(
    links.map((link) => ({
      link_id: link.id,
      domain: link.domain,
      key: link.key,
      url: link.url,
      tag_ids: link.tags.map((tag) => tag.tagId),
      folder_id: null,
      workspace_id: link.projectId,
      created_at: link.createdAt,
    })),
  );

  console.log(res);
}

main();
