import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Move the program links to a folder.
async function main() {
  const workspaceId = "";
  const folderId = "";

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      programId: {
        not: null,
      },
    },
  });

  if (links.length === 0) {
    console.log("No links found.");
    return;
  }

  await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: {
      folderId,
    },
  });
}

main();
