import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { includeTags } from "../lib/api/links/include-tags";
import { recordLink } from "../lib/tinybird";

// Move the program links to a folder.
async function main() {
  const workspaceId = "xxx";
  const folderId = "fold_xxx";

  const condition = {
    programId: {
      not: null,
    },
  };

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      ...condition,
    },
  });

  if (links.length === 0) {
    console.log("No links found.");
    return;
  }

  console.log(links);

  await prisma.link.updateMany({
    where: {
      projectId: workspaceId,
      ...condition,
    },
    data: { folderId },
  });

  const updatedLinks = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      ...condition,
    },
    include: includeTags,
  });

  console.table(updatedLinks);

  const res = await recordLink(updatedLinks);
  console.log(res);
}

main();
