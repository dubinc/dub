import prisma from "@/lib/prisma";
import "dotenv-flow/config";

/**
 * Propagates LinkTag records for links with tagIds
 */
async function main() {
  // Get all links with Tags but without TagLinks
  const links = await prisma.link.findMany({
    where: {
      tagId: {
        not: null,
      },
      tags: {
        none: {},
      },
    },
  });

  // make sure all tagId exist
  const tagIds = links.map(({ tagId }) => tagId!);
  const tags = await prisma.tag.findMany({
    where: {
      id: {
        in: tagIds,
      },
    },
  });

  console.log(`Updating ${links.length} links...`);

  const response = await prisma.linkTag.createMany({
    data: links
      // filter out links with tagIds that don't exist
      .filter(({ tagId }) => tags.find((tag) => tag.id === tagId) !== undefined)
      .map((link) => ({
        linkId: link.id,
        tagId: link.tagId!, // cause we filtered out links without tagId
      })),
  });

  console.log(`Created ${response.count} LinkTag records`);

  // const tagsThatDontExist = await Promise.all(
  //   links.map(async ({ tagId }) => ({
  //     id: tagId,
  //     tag: await prisma.tag.findUnique({
  //       where: {
  //         id: tagId!,
  //       },
  //     }),
  //   })),
  // ).then((tags) => tags.filter(({ tag }) => !tag).map(({ id }) => id));

  // console.log(
  //   `Tags that don't exist: ${JSON.stringify(tagsThatDontExist, null, 2)}`,
  // );
}

main();
