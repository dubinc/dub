import { createId } from "@/lib/api/create-id";
import { PartnerGroupAdditionalLink } from "@/lib/types";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany({
    include: {
      groups: true,
    },
  });

  console.log(`Found ${programs.length} programs.`);

  for (const program of programs) {
    let additionalLink: PartnerGroupAdditionalLink | undefined = undefined;

    if (program.maxPartnerLinks > 0) {
      additionalLink = {
        url: program.url!,
        urlValidationMode: program.urlValidationMode,
      };
    }

    await prisma.partnerGroup.updateMany({
      where: {
        id: {
          in: program.groups.map(({ id }) => id),
        },
      },
      data: {
        linkStructure: program.linkStructure,
        maxPartnerLinks: program.maxPartnerLinks,
        ...(additionalLink && { additionalLinks: [additionalLink] }),
      },
    });

    const res = await prisma.partnerGroupDefaultLink.createMany({
      data: program.groups.map((group) => ({
        id: createId(),
        programId: program.id,
        groupId: group.id,
        domain: program.domain!,
        url: program.url!,
      })),
      skipDuplicates: true,
    });

    console.log(`Created ${res.count} partner group default links.`);

    const partnerGroupDefaultLinks =
      await prisma.partnerGroupDefaultLink.findMany({
        where: {
          programId: program.id,
        },
      });

    const groupIdToPartnerGroupDefaultLinkId = partnerGroupDefaultLinks.reduce(
      (acc, link) => {
        acc[link.groupId] = link.id;
        return acc;
      },
      {} as Record<string, string>,
    );

    const partnerLinks = await prisma.link.findMany({
      where: {
        programId: program.id,
        url: program.url!,
      },
    });

    // get the first created link for each partner
    const firstPartnerLinks = partnerLinks.filter(
      (link, index, self) =>
        index === self.findIndex((t) => t.partnerId === link.partnerId),
    );

    console.table(firstPartnerLinks, [
      "id",
      "shortLink",
      "partnerId",
      "createdAt",
    ]);

    // await prisma.link.updateMany({
    //   where: {
    //     id: {
    //       in: firstPartnerLinks.map(({ id }) => id),
    //     },
    //   },
    //   data: {
    //     partnerGroupDefaultLinkId: partnerLinks[0].id,
    //   },
    // });
  }
}

main();
