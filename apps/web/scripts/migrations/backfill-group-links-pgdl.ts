import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Helper function to normalize URL by removing UTM parameters
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

// Step 2 of 2: Backfill partner links with partnerGroupDefaultLinkId
async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      slug: "acme",
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
    const defaultLink = group.partnerGroupDefaultLinks[0];

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
      },
      take: 100,
      include: {
        links: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const firstPartnerLinks = programEnrollments
      .map(({ programId, partnerId, links }) => {
        const firstPartnerLink = links.find(
          (link) => normalizeUrl(link.url) === normalizeUrl(defaultLink.url),
        );
        if (!firstPartnerLink) {
          console.log(
            `No partner link found for ${programId} ${partnerId} that matches ${defaultLink.url}`,
          );
          return null;
        }
        return {
          id: firstPartnerLink?.id,
          shortLink: firstPartnerLink?.shortLink,
          url: firstPartnerLink?.url,
          defaultLinkId: firstPartnerLink?.partnerGroupDefaultLinkId,
        };
      })
      .filter((link) => link !== null);

    console.table(firstPartnerLinks, [
      "id",
      "shortLink",
      "url",
      "defaultLinkId",
    ]);
  }
}

main();
