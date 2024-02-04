import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import { redis } from "./utils";

const domain = "song.fyi";

async function main() {
  const response = await Promise.all([
    prisma.link.deleteMany({
      where: {
        domain,
      },
    }),
    redis.del(domain),
  ]);

  console.log(JSON.stringify(response, null, 2));
}

main();
