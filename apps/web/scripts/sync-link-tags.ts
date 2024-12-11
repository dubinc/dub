// import { prisma } from "@dub/prisma";
// import "dotenv-flow/config";

// /**
//  * Propagates LinkTag records for links with tagIds
//  */
// async function main() {
//   // Get all links with Tags but without TagLinks
//   const links = await prisma.link.findMany({
//     where: {
//       tagId: {
//         not: null,
//       },
//       tags: {
//         none: {},
//       },
//     },
//     take: 5000,
//   });

//   // make sure all tagId exist
//   const tagIds = links.map(({ tagId }) => tagId!);
//   const tags = await prisma.tag.findMany({
//     where: {
//       id: {
//         in: tagIds,
//       },
//     },
//   });

//   const missingTags = tagIds.filter(
//     (tagId) => tags.find((tag) => tag.id === tagId) === undefined,
//   );
//   console.log(`Missing tags: ${missingTags.length}`, missingTags);

//   // filter out links with tagIds that don't exist
//   const linksWithValidTags = links.filter(
//     ({ tagId }) => tags.find((tag) => tag.id === tagId) !== undefined,
//   );

//   console.log(`Updating ${links.length} links...`);

//   const response = await prisma.linkTag.createMany({
//     data: linksWithValidTags.map((link) => ({
//       linkId: link.id,
//       tagId: link.tagId!, // cause we filtered out links without tagId
//     })),
//   });

//   console.log(`Created ${response.count} LinkTag records`);
// }

// main();
