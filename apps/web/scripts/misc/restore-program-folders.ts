import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordLink } from "../../lib/tinybird/record-link";

async function main() {
  const deactivatedPrograms = await prisma.program.findMany({
    where: {
      deactivatedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      slug: true,
      workspaceId: true,
      defaultFolderId: true,
      workspace: {
        select: {
          id: true,
          users: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  for (const program of deactivatedPrograms) {
    await prisma.folder.upsert({
      where: {
        id: program.defaultFolderId,
      },
      create: {
        id: program.defaultFolderId,
        name: "Partner Links",
        projectId: program.workspaceId,
        accessLevel: "write",
        users: {
          create: {
            userId: program.workspace.users[0].id,
            role: "owner",
          },
        },
      },
      update: {},
    });

    while (true) {
      const linksToUpdate = await prisma.link.findMany({
        where: {
          programId: program.id,
          folderId: null,
        },
        take: 250,
      });

      if (linksToUpdate.length === 0) {
        break;
      }

      const res = await prisma.link.updateMany({
        where: {
          id: { in: linksToUpdate.map((link) => link.id) },
        },
        data: { folderId: program.defaultFolderId },
      });
      console.log(`Updated ${res.count} links`);

      const updatedLinks = await prisma.link.findMany({
        where: {
          id: { in: linksToUpdate.map((link) => link.id) },
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
        },
      });

      const tbRes = await recordLink(updatedLinks);
      console.log("tbRes", tbRes);
    }
  }
}

main();
