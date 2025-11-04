import { sanitizeWebsite } from "@/lib/social-utils";
import { prisma } from "@dub/prisma";
import { Partner } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      AND: [
        {
          website: { not: "" },
        },
        {
          website: { not: null },
        },
        {
          OR: [
            { website: { not: { contains: "http" } } },
            { website: { contains: "?" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      website: true,
    },
    take: 50,
  });

  if (partners.length === 0) {
    console.log("No partners found.");
    return;
  }

  console.log("Partners with websites");
  console.table(partners);

  const updatedPartners: Pick<Partner, "id" | "website">[] = [];

  for (const { id, website } of partners) {
    let updatedWebsite = sanitizeWebsite(website);

    const needsUpdate = updatedWebsite !== website;

    if (needsUpdate) {
      updatedPartners.push({
        id,
        website: updatedWebsite,
      });

      await prisma.partner.update({
        where: {
          id,
        },
        data: {
          website: updatedWebsite,
        },
      });
    }
  }

  console.log("Updated partners");
  console.table(updatedPartners);
}

main();
