import { prisma } from "@dub/prisma";
import { LEGAL_USER_ID } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { updateConfig } from "../../lib/edge-config";

// script to get the top google ads campaign ids in fraud events
async function main() {
  const project = await prisma.project.findUniqueOrThrow({
    where: {
      slug: "xxx",
    },
    include: {
      users: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (project.users.length === 0) {
    console.log("No users found");
    return;
  }

  const linksToDisable = await prisma.link.findMany({
    where: {
      projectId: project.id,
      disabledAt: null,
    },
  });

  if (linksToDisable.length > 0) {
    const disabledLinks = await prisma.link.updateMany({
      where: {
        id: {
          in: linksToDisable.map((link) => link.id),
        },
      },
      data: {
        disabledAt: new Date(),
      },
    });

    console.log(`Disabled ${disabledLinks.count} links`);

    const res = await linkCache.expireMany(linksToDisable);
    console.log(res);
  }

  const userToBan = project.users[0].user;

  await prisma.projectUsers.update({
    where: {
      userId_projectId: {
        userId: userToBan.id,
        projectId: project.id,
      },
    },
    data: {
      userId: LEGAL_USER_ID,
    },
  });

  await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      name: userToBan.email!,
    },
  });

  await updateConfig({
    key: "emails",
    value: userToBan.email!,
  });

  console.log(
    `Banned ${userToBan.email}, transfered project ${project.slug} to legal user`,
  );
}

main();
