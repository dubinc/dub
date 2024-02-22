import prisma from "@/lib/prisma";
import "dotenv-flow/config";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";

const domain = "song.fyi";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    select: {
      id: true,
      key: true,
      url: true,
      projectId: true,
    },
  });
  const response = await Promise.all([
    prisma.link.deleteMany({
      where: {
        domain,
      },
    }),
    redis.del(domain),
    ...links.map(({ id, key, url, projectId }) =>
      recordLink({
        link: {
          id,
          domain,
          key,
          url,
          projectId,
        },
        deleted: true,
      }),
    ),
  ]);

  console.log(JSON.stringify(response, null, 2));
}

main();
