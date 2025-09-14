import { prisma } from "@dub/prisma";
import { normalizeUrl } from "@dub/utils";
import "dotenv-flow/config";

// Step 2 of 2: Backfill partner links with partnerGroupDefaultLinkId
async function main() {
  const programs = await prisma.program.findMany({
    include: {
      groups: {
        include: {
          partnerGroupDefaultLinks: true,
        },
      },
    },
  });

  for (const program of programs) {
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
          // filter out enrollments that already have a default link
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
        take: 500,
      });

      if (programEnrollments.length === 0) {
        console.log(
          `No program enrollments needfound for group ${group.id}. Skipping...`,
        );
        continue;
      }

      const firstPartnerLinkIds = programEnrollments.map(
        (programEnrollment) => {
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

          return firstPartnerLink.id;
        },
      );

      console.table(firstPartnerLinkIds);

      const res = await prisma.link.updateMany({
        where: {
          id: {
            in: firstPartnerLinkIds.filter((id) => id !== null),
          },
        },
        data: {
          partnerGroupDefaultLinkId: defaultLink.id,
        },
      });

      console.log(
        `Updated ${res.count} links with default link ${defaultLink.id}`,
      );
    }
  }
}

main();
