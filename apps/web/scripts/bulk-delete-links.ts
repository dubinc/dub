import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { redis } from "./utils";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "steven.blue",
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
        domain: "steven.blue",
      },
    }),
  ]);

  console.log(JSON.stringify(response, null, 2));
}

main();
