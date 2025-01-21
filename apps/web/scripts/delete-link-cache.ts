import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// This script delete the existing link's cache
// Run this after https://github.com/dubinc/dub/pull/1335 is merged
async function main() {
  const domains = await prisma.domain.findMany({
    take: 1,
    skip: 0,
  });

  if (domains.length === 0) {
    console.log("No domains found");
    return;
  }

  const pipeline = redis.pipeline();

  domains.map((domain) => pipeline.del(domain.slug.toLocaleLowerCase()));

  const result = await pipeline.exec();

  // 1 means success, 0 means failure
  console.log("Result", result);
}

main();
