import { prisma } from "@dub/prisma";
import { normalizeUrl } from "@dub/utils";
import "dotenv-flow/config";

// special script for checking if acme default links are set up properly
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
      include: {
        links: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const firstPartnerLinks = await Promise.all(
      programEnrollments.map(async (programEnrollment) => {
        const { programId, partnerId, links } = programEnrollment;
        const foundDefaultLink = links.find(
          (link) => link.partnerGroupDefaultLinkId,
        );
        const firstPartnerLink = links.find(
          (link) => normalizeUrl(link.url) === normalizeUrl(defaultLink.url),
        );

        const {
          groupDefaultLinkId,
          partnerDefaultLinkId,
          firstPartnerLinkDefaultLinkId,
        } = {
          groupDefaultLinkId: defaultLink.id,
          partnerDefaultLinkId: foundDefaultLink?.partnerGroupDefaultLinkId,
          firstPartnerLinkDefaultLinkId:
            firstPartnerLink?.partnerGroupDefaultLinkId,
        };

        const matchingDefaultLink = [
          partnerDefaultLinkId,
          firstPartnerLinkDefaultLinkId,
        ].every((id) => id === groupDefaultLinkId);

        if (!matchingDefaultLink) {
          await prisma.link.update({
            where: {
              id: firstPartnerLink?.id,
            },
            data: {
              partnerGroupDefaultLinkId: groupDefaultLinkId,
            },
          });

          console.log(
            `Updated link ${firstPartnerLink?.id} to have default link ${groupDefaultLinkId}`,
          );
        }

        return {
          id: firstPartnerLink?.id,
          shortLink: firstPartnerLink?.shortLink,
          url: firstPartnerLink?.url,
          programId,
          partnerId,
          groupDefaultLinkId,
          partnerDefaultLinkId,
          firstPartnerLinkDefaultLinkId,
          matchingDefaultLink,
        };
      }),
    );

    console.table(firstPartnerLinks);
  }
}

main();
