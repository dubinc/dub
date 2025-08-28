import { AdditionalPartnerLink, DefaultPartnerLink } from "@/lib/types";
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
    const defaultLink: DefaultPartnerLink = {
      domain: program.domain!,
      url: program.url!,
    };

    let additionalLink: AdditionalPartnerLink | undefined = undefined;

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
        defaultLinks: [defaultLink],
        ...(additionalLink && { additionalLinks: [additionalLink] }),
      },
    });
  }
}

main();
