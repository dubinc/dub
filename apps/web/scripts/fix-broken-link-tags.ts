import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const linkTags = await prisma.link.findMany({
    where: {
      projectId: "clrei1gld0002vs9mzn93p8ik",
    },
    include: {
      tags: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const tagIds = linkTags.flatMap((link) => link.tags.map((tag) => tag.tagId));

  const tags = await prisma.tag.findMany({
    where: {
      id: { in: tagIds },
    },
  });
  const tagsThatDontExist = tagIds.filter(
    (tagId) => !tags.some((tag) => tag.id === tagId),
  );

  const linksForTagsThatDontExist = await prisma.link.findMany({
    where: {
      tags: {
        some: { tagId: { in: tagsThatDontExist } },
      },
    },
  });

  const deleteLinks = await prisma.link.deleteMany({
    where: {
      id: { in: linksForTagsThatDontExist.map((link) => link.id) },
    },
  });

  console.log({ tagsThatDontExist, linksForTagsThatDontExist, deleteLinks });
}

main();
