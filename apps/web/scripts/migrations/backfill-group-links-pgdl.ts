import { prisma } from "@dub/prisma";
import { normalizeUrl } from "@dub/utils";
import "dotenv-flow/config";

// Step 2 of 2: Backfill partner links with partnerGroupDefaultLinkId
async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      slug: "xxx",
    },
    include: {
      groups: {
        include: {
          partnerGroupDefaultLinks: true,
        },
      },
    },
  });

  for (const group of program.groups) {
    if (group.partnerGroupDefaultLinks.length === 0) {
      // should never happen, but just in case
      console.log(
        `WARNING: No default links found for group ${group.id}. Skipping...`,
      );
      continue;
    }

    const defaultLink = group.partnerGroupDefaultLinks[0];

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
        links: {
          every: {
            partnerGroupDefaultLinkId: null,
          },
        },
      },
      include: {
        links: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      take: 100,
    });

    const firstPartnerLinks = programEnrollments.map(
      async (programEnrollment) => {
        const { links } = programEnrollment;
        const firstPartnerLink = links.find(
          (link) => normalizeUrl(link.url) === normalizeUrl(defaultLink.url),
        );

        if (!firstPartnerLink) {
          console.log(
            `WARNING: No matching partner link found for partner ${programEnrollment.partnerId} in group ${group.id}. Skipping...`,
          );
          return null;
        }

        return {
          id: firstPartnerLink.id,
          partnerGroupDefaultLinkId: defaultLink.id,
        };
      },
    );

    console.table(firstPartnerLinks);
  }
}

main();
