import { sanitizeSocialHandle, type SocialPlatform } from "@/lib/social-utils";
import { prisma } from "@dub/prisma";
import { Partner } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      OR: [
        { youtube: { not: null } },
        { twitter: { not: null } },
        { linkedin: { not: null } },
        { instagram: { not: null } },
        { tiktok: { not: null } },
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
    skip: 0,
    take: 10,
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

    let needsUpdate = false;

    for (const [platform, value] of Object.entries(socialHandles)) {
      if (value && (value.startsWith("http") || value.startsWith("@"))) {
        updatedSocialHandles[platform] = sanitizeSocialHandle(
          value,
          platform as SocialPlatform,
        );

        needsUpdate = true;
      }
    }

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
