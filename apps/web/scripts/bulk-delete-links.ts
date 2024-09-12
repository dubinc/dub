import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import "dotenv-flow/config";

const domain = "song.fyi";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    select: {
      id: true,
      domain: true,
      key: true,
      url: true,
      projectId: true,
      tags: true,
      createdAt: true,
    },
    // take: 10000,
  });
  const response = await Promise.allSettled([
    prisma.link.deleteMany({
      where: {
        domain,
        id: {
          in: links.map((link) => link.id),
        },
      },
    }),
    // redis.del(domain),
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.tagId),
        folder_id: null,
        workspace_id: link.projectId,
        created_at: link.createdAt,
        deleted: true,
      })),
    ),
  ]);

  console.log(links.length);
  console.table(links.slice(-10), ["domain", "key"]);
  console.log(response);
}

main();
