import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.LinkWhereInput = {
    projectId: "cm05wnnpo000711ztj05wwdbu",
    archived: false,
    folderId: "fold_LIZsdjTgFVbQVGYSUmYAi5vT",
  };

  const links = await prisma.link.findMany({
    where,
    select: {
      id: true,
      key: true,
      createdAt: true,
    },
    take: 1000,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!links.length) {
    console.log("No more links to delete.");
    return;
  }

  // console.table(links);

  await prisma.link.deleteMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
  });

  console.log(`Deleted ${links.length} links`);
  const finalDeletedLink = links[links.length - 1];
  console.log(
    `Final deleted link: ${finalDeletedLink.key} (${new Date(finalDeletedLink.createdAt).toISOString()})`,
  );
}

main();
