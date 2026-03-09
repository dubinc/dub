import { sanitizeSocialHandle, sanitizeWebsite } from "@/lib/social-utils";
import { prisma } from "@dub/prisma";
import { youtubeChannelSchema } from "app/(ee)/api/cron/partner-platforms/youtube/youtube-channel-schema";
import "dotenv-flow/config";

async function main() {
  while (true) {
    const partnerPlatforms = await prisma.partnerPlatform.findMany({
      where: {
        type: "website",
        NOT: {
          identifier: {
            startsWith: "http",
          },
        },
      },
      take: 20,
    });

    if (partnerPlatforms.length === 0) {
      console.log("No website platforms to process");
      break;
    }

    await Promise.allSettled(
      partnerPlatforms.map(async (partnerPlatform) => {
        if (partnerPlatform.type === "website") {
          const sanitizedIdentifier = sanitizeWebsite(
            partnerPlatform.identifier,
          );
          if (!sanitizedIdentifier) {
            if (partnerPlatform.verifiedAt) {
              console.log(
                `NOT DELETING VERIFIED PLATFORM ${partnerPlatform.id}: ${partnerPlatform.identifier}`,
              );
              return;
            }
            await prisma.partnerPlatform.delete({
              where: {
                id: partnerPlatform.id,
              },
            });
            console.log(
              `Deleted invalid platform identifier: ${partnerPlatform.identifier}`,
            );
            return;
          }

          await prisma.partnerPlatform.update({
            where: { id: partnerPlatform.id },
            data: { identifier: sanitizedIdentifier },
          });
          console.log(
            `Updated website identifier: ${partnerPlatform.identifier} → ${sanitizedIdentifier}`,
          );
          return;
        }

        if (
          partnerPlatform.type === "youtube" &&
          partnerPlatform.identifier.includes("/channel/")
        ) {
          const channelId = partnerPlatform.identifier.split("/channel/")[1];
          console.log(`Fetching YouTube channelId : ${channelId}`);
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}`,
            {
              headers: {
                "X-Goog-Api-Key": process.env.YOUTUBE_API_KEY!,
              },
            },
          );
          if (!response.ok) {
            console.error(
              "Failed to fetch YouTube channel:",
              await response.text(),
            );
            return;
          }
          const json = await response.json();
          console.log(JSON.stringify(json, null, 2));
          const data = youtubeChannelSchema.parse(json.items[0]);
          if (!data.snippet?.customUrl) {
            console.error("No custom URL found for YouTube channel:", data);
            return;
          }
          const youtubeHandle = data.snippet.customUrl.replace("@", "");
          console.log(
            `Found handle for YouTube channel: ${youtubeHandle}, updating identifier...`,
          );
          await prisma.partnerPlatform.update({
            where: { id: partnerPlatform.id },
            data: { identifier: youtubeHandle },
          });
          return;
        }

        const sanitizedIdentifier = sanitizeSocialHandle(
          partnerPlatform.identifier,
          partnerPlatform.type,
        );

        if (!sanitizedIdentifier) {
          if (partnerPlatform.verifiedAt) {
            console.log(
              `NOT DELETING VERIFIED PLATFORM ${partnerPlatform.id}: ${partnerPlatform.identifier}`,
            );
            return;
          }
          await prisma.partnerPlatform.delete({
            where: {
              id: partnerPlatform.id,
            },
          });
          console.log(
            `Deleted invalid platform identifier: ${partnerPlatform.identifier}`,
          );
          return;
        }

        await prisma.partnerPlatform.update({
          where: {
            id: partnerPlatform.id,
          },
          data: {
            identifier: sanitizedIdentifier,
          },
        });
        console.log(
          `Updated ${partnerPlatform.identifier} → ${sanitizedIdentifier}`,
        );
      }),
    );
  }
}

main();
