import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { normalizeUrl } from "@dub/utils";
import "dotenv-flow/config";
import { bulkCreateLinks } from "../../lib/api/links";
import { derivePartnerLinkKey } from "../../lib/api/partners/generate-partner-link";

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
      const linksToCreate: ProcessedLinkProps[] = [];
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
          program: {
            include: {
              workspace: {
                include: {
                  users: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          },
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
        const { program, partner, links } = programEnrollment;
        const firstPartnerLink = links.find(
          (link) => normalizeUrl(link.url) === normalizeUrl(defaultLink.url),
        );

        if (!firstPartnerLink) {
          const firstLink = links.length > 0 ? links[0] : null;
          console.log(
            `Didn't find a matching link for partner ${partner.email} (${partner.id}). ${firstLink ? `Their first link is ${firstLink.url} while the default link is ${defaultLink.url}` : "They have no links"}`,
          );
          if (!firstLink) {
            linksToCreate.push({
              domain: defaultLink.domain,
              url: defaultLink.url,
              key: `${derivePartnerLinkKey({
                name: partner?.name,
                email: partner?.email!,
              })}`,
              trackConversion: true,
              projectId: program.workspace.id,
              programId: program.id,
              folderId: program.defaultFolderId,
              partnerId: partner?.id,
              tenantId: programEnrollment.tenantId,
              partnerGroupDefaultLinkId: defaultLink.id,
              userId: program.workspace.users[0].userId,
            });
          }
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

      console.log(`Found ${linksToCreate.length} links to create`);
      console.table(linksToCreate);

      const createRes = await bulkCreateLinks({
        links: linksToCreate,
      });
      console.log(`Created ${createRes.length} links`);
      console.table(createRes, [
        "domain",
        "key",
        "url",
        "folderId",
        "partnerId",
        "programId",
      ]);
    }
  }
}

main();
