import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  // get first project for each user and set it as default workspace
  const res = await prisma.projectUsers.findMany({
    select: {
      userId: true,
      project: {
        select: {
          slug: true,
        },
      },
    },
    distinct: ["userId"],
    orderBy: {
      createdAt: "asc",
    },
    take: 100,
  });

  console.table(res);
}

main();
