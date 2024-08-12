import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const [users, count] = await Promise.all([
    prisma.user.findMany({
      where: {
        projects: {
          none: {},
        },
        links: {
          none: {},
        },
      },
      select: {
        email: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            links: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.user.count({
      where: {
        projects: {
          none: {},
        },
        links: {
          none: {},
        },
      },
    }),
  ]);
  // log in table format
  console.table(users);
  console.log(`Total: ${count}`);
}

main();
