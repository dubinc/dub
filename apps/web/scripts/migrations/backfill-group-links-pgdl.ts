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
      const linksToUpdate: { id: string; shortLink: string }[] = [];

      const alreadyUpdatedLinks = await prisma.link.findMany({
        where: {
          partnerGroupDefaultLinkId: defaultLink.id,
        },
      });

      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
          status: {
            notIn: ["pending", "rejected", "banned"],
          },
          // filter out enrollments that already have a default link
          partnerId: {
            notIn: alreadyUpdatedLinks.map((link) => link.partnerId!),
          },
        },
        include: {
          partner: true,
          links: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        take: 1000,
      });

      if (programEnrollments.length === 0) {
        console.log(
          `No more program enrollments found for group ${group.id}. Skipping...`,
        );
        continue;
      }

      for (const programEnrollment of programEnrollments) {
        const { partner, links } = programEnrollment;
        const firstPartnerLink = links.find(
          (link) => normalizeUrl(link.url) === normalizeUrl(defaultLink.url),
        );

        if (!firstPartnerLink) {
          const firstLink = links.length > 0 ? links[0] : null;
          console.log(
            `Didn't find a matching link for partner ${partner.email} (${partner.id}). ${firstLink ? `Their first link is ${firstLink.url} while the default link is ${defaultLink.url}` : "They have no links"}`,
          );
          continue;
        }

        linksToUpdate.push({
          id: firstPartnerLink.id,
          shortLink: firstPartnerLink.shortLink,
        });
      }

      const updateRes = await prisma.link.updateMany({
        where: {
          id: {
            in: linksToUpdate.map((link) => link.id),
          },
        },
        data: {
          partnerGroupDefaultLinkId: defaultLink.id,
        },
      });

      console.log(
        `Updated ${updateRes.count} links with default link ${defaultLink.id}`,
      );
      console.table(linksToUpdate.slice(0, 10), ["id", "shortLink"]);
    }
  }
}

main();
