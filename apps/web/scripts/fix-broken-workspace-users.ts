import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const userIds = await prisma.user.findMany({
    select: {
      id: true,
    },
  });
  const projectUserIds = await prisma.projectUsers.findMany({
    select: {
      userId: true,
    },
  });

  // check projectUserIds that don't exist in userIds
  const projectUserIdsSet = new Set(
    projectUserIds.map((projectUser) => projectUser.userId),
  );
  const userIdsSet = new Set(userIds.map((user) => user.id));
  const diff = new Set(
    [...projectUserIdsSet].filter((x) => !userIdsSet.has(x)),
  );
  console.log(diff);

  // const res = await prisma.projectUsers.deleteMany({
  //   where: {
  //     userId: {
  //       in: [],
  //     },
  //   },
  // });

  // console.log(res);
}

main();
