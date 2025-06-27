import { sanitizeSocialHandle, type SocialPlatform } from "@/lib/social-utils";
import { prisma } from "@dub/prisma";
import { deepEqual } from "@dub/utils";
import { Partner } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      OR: [
        { youtube: { contains: "@" } },
        { youtube: { contains: "http" } },
        { twitter: { contains: "@" } },
        { twitter: { contains: "http" } },
        { linkedin: { contains: "@" } },
        { linkedin: { contains: "http" } },
        { instagram: { contains: "@" } },
        { instagram: { contains: "http" } },
        { tiktok: { contains: "@" } },
        { tiktok: { contains: "http" } },
      ],
    },
    select: {
      id: true,
      youtube: true,
      twitter: true,
      linkedin: true,
      instagram: true,
      tiktok: true,
    },
    take: 50,
  });

  if (partners.length === 0) {
    console.log("No partners found processing.");
    return;
  }

  console.log("Partners with social handles");
  console.table(partners);

  const updatedPartners: Pick<
    Partner,
    "id" | "youtube" | "twitter" | "linkedin" | "instagram" | "tiktok"
  >[] = [];

  for (const { id, ...socialHandles } of partners) {
    let updatedSocialHandles = {
      ...socialHandles,
    };

    for (const [platform, value] of Object.entries(socialHandles)) {
      updatedSocialHandles[platform] = sanitizeSocialHandle(
        value,
        platform as SocialPlatform,
      );
    }

    const needsUpdate =
      deepEqual(socialHandles, updatedSocialHandles) === false;

    if (needsUpdate) {
      updatedPartners.push({
        id,
        ...updatedSocialHandles,
      });

      await prisma.partner.update({
        where: {
          id,
        },
        data: updatedSocialHandles,
      });
    }
  }

  console.log("Updated partners");
  console.table(updatedPartners);
}

main();
