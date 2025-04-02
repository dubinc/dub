import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { includeTags } from "../lib/api/links/include-tags";
import { recordLink } from "../lib/tinybird";

// Move the program links to a folder.
async function main() {
  const workspaceId = "xxx";
  const folderId = "fold_xxx";

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      programId: {
        not: null,
      },
      folderId: null,
    },
    select: {
      id: true,
    },
  });

  if (links.length === 0) {
    console.log("No links found.");
    return;
  }

  console.log(links);

  await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: { folderId },
  });

  const updatedLinks = await prisma.link.findMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    include: includeTags,
  });

  console.table(updatedLinks);

  const res = await recordLink(updatedLinks);
  console.log(res);
}

main();
