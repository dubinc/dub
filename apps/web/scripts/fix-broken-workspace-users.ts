import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  let batch = 0;
  while (true) {
    const workspaceUserIds = await prisma.projectUsers.findMany({
      select: {
        userId: true,
      },
      take: 50000,
      skip: batch * 50000,
    });
    if (workspaceUserIds.length === 0) {
      break;
    }
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: workspaceUserIds.map((workspaceUser) => workspaceUser.userId),
        },
      },
    });
    const usersThatDontExist = workspaceUserIds.filter(
      (workspaceUser) =>
        !users.some((user) => user.id === workspaceUser.userId),
    );
    console.log(usersThatDontExist);

    const deletedWorkspaceUsers = await prisma.projectUsers.deleteMany({
      where: {
        userId: {
          in: usersThatDontExist.map((workspaceUser) => workspaceUser.userId),
        },
      },
    });
    console.log(`Deleted ${deletedWorkspaceUsers.count} workspace users`);
    batch++;
  }
}

main();
