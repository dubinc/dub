import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { redis } from "./utils";

const domain = "song.fyi";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
  });

  const pipeline = redis.pipeline();
  links.forEach(({ domain, key }) => {
    pipeline.del(`${domain}:${key}`);
  });

  const response = await Promise.all([
    pipeline.exec(),
    prisma.link.deleteMany({
      where: {
        domain,
      },
    }),
  ]);

  console.log(JSON.stringify(response, null, 2));
}

main();
