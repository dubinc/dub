import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const folderCounts = await prisma.folder.groupBy({
    by: ["projectId"],
    _count: true,
    orderBy: {
      _count: {
        projectId: "desc",
      },
    },
  });

  console.log({ folderCounts });

  for (const folderCount of folderCounts) {
    await prisma.project.update({
      where: { id: folderCount.projectId },
      data: { foldersUsage: folderCount._count },
    });
  }
}

main();
