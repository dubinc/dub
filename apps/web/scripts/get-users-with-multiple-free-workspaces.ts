import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const freeProjectUsers = await prisma.projectUsers
    .groupBy({
      by: ["userId"],
      where: {
        role: "owner",
        project: {
          plan: "free",
        },
        user: {
          createdAt: {
            gte: new Date("2024-01-01"), // we used to allow creating unlimited free projects before this date
          },
        },
      },
      _count: {
        projectId: true,
      },
      orderBy: {
        _count: {
          projectId: "desc",
        },
      },
    })
    .then((res) => res.filter((user) => user._count.projectId > 2));

  // only 2 users: user_1JQ4XWW8DE941MT2W58QEBH0H, user_1JQ6T72YAWND8716B3DTAE979
  // both via pen-testing
  console.log(freeProjectUsers);
}

main();
