import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";

// script to restore access to a workspace for a user
async function main() {
  const project = await prisma.project.findUniqueOrThrow({
    where: {
      slug: "xxx",
    },
  });

  while (true) {
    const linksToRestore = await prisma.link.findMany({
      where: {
        projectId: project.id,
        disabledAt: {
          not: null,
        },
      },
      take: 100,
    });
    if (linksToRestore.length === 0) {
      console.log("No more links to restore. Exiting...");
      break;
    }

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
  }

  const updatedOwners = await prisma.projectUsers.updateMany({
    where: {
      projectId: project.id,
      role: "billing",
    },
    data: {
      role: "owner",
    },
  });

  console.log(`Reverted ${updatedOwners.count} billing to owner role`);

  const updatedMembers = await prisma.projectUsers.updateMany({
    where: {
      projectId: project.id,
      role: "viewer",
    },
    data: {
      role: "member",
    },
  });

  console.log(`Reverted ${updatedMembers.count} viewers to member role`);
}

main();
