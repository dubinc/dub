import { createId } from "@/lib/api/create-id";
import { PartnerGroupAdditionalLink } from "@/lib/types";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Step 1 of 2: Backfill partner groups with link settings
async function main() {
  const programs = await prisma.program.findMany({
    where: {
      slug: "acme",
    },
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

    const pgRes = await prisma.partnerGroup.updateMany({
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
    console.log(`Updated ${pgRes.count} partner groups.`);

    const pgdlRes = await prisma.partnerGroupDefaultLink.createMany({
      data: program.groups.map((group) => ({
        id: createId({ prefix: "pgdl_" }),
        programId: program.id,
        groupId: group.id,
        domain: program.domain!,
        url: program.url!,
      })),
      skipDuplicates: true,
    });

    console.log(`Created ${pgdlRes.count} partner group default links.`);
  }
}

main();
