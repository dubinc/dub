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

    await prisma.partnerGroupDefaultLink.createMany({
      data: program.groups.map((group) => ({
        id: createId(),
        programId: program.id,
        groupId: group.id,
        domain: program.domain!,
        url: program.url!,
      })),
    });
  }
}

main();
