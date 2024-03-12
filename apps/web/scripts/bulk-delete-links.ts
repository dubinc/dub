import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import "dotenv-flow/config";

const filters = {
  domain: "song.fyi",
};

async function main() {
  const links = await prisma.link.findMany({
    where: filters,
    select: {
      id: true,
      domain: true,
      key: true,
      url: true,
      projectId: true,
      tags: true,
    },
  });
  const response = await Promise.all([
    // prisma.link.deleteMany({
    //   where: filters,
    // }),
    ...links.flatMap((link) => [
      redis.hdel(link.domain, link.key.toLowerCase()),
      recordLink({
        link,
        deleted: true,
      }),
    ]),
  ]);

  console.log(links.length);
  console.table(links.slice(0, 10), ["domain", "key"]);
  console.log(response);
}

main();
