import { prisma } from "@dub/prisma";
import { LEGAL_USER_ID } from "@dub/utils";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";

// script to restore access to a workspace for a user
async function main() {
  const project = await prisma.project.findUniqueOrThrow({
    where: {
      slug: "xxx",
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email: project.name,
    },
  });

  const linksToRestore = await prisma.link.findMany({
    where: {
      projectId: project.id,
      disabledAt: {
        not: null,
      },
    },
  });

  if (linksToRestore.length > 0) {
    const restoredLinks = await prisma.link.updateMany({
      where: {
        id: {
          in: linksToRestore.map((link) => link.id),
        },
      },
      data: {
        disabledAt: null,
      },
    });

    console.log(`Restored ${restoredLinks.count} links`);

    const res = await linkCache.expireMany(linksToRestore);
    console.log(res);
  }

  await prisma.projectUsers.update({
    where: {
      userId_projectId: {
        userId: LEGAL_USER_ID,
        projectId: project.id,
      },
    },
    data: {
      userId: user.id,
    },
  });

  await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      name: project.slug,
    },
  });

  console.log(
    `Restored access to project ${project.slug} for user ${user.email}`,
  );
}

main();
