import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { youtubeChannelSchema } from "./youtube-channel-schema";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1000;
const YOUTUBE_API_CHUNK_SIZE = 50;

const schema = z.object({
  startingAfter: z.string().optional(),
});

/**
 * This route is used to update stats for YouTube verified partners using the YouTube API
 * Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
 * POST /api/cron/partner-platforms/youtube
 */
export const POST = withCron(async ({ rawBody }) => {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not defined");
  }

  let { startingAfter } = schema.parse(
    rawBody ? JSON.parse(rawBody) : { startingAfter: undefined },
  );

  const youtubeChannels = await prisma.partnerPlatform.findMany({
    where: {
      type: PlatformType.youtube,
      verifiedAt: {
        not: null,
      },
      platformId: {
        not: null,
      },
    },
    take: BATCH_SIZE,
    ...(startingAfter && {
      cursor: {
        id: startingAfter,
      },
      skip: 1,
    }),
    orderBy: {
      id: "asc",
    },
  });

  if (youtubeChannels.length === 0) {
    return logAndRespond(
      "No more YouTube platforms found. Finished updating YouTube stats.",
    );
  }

  const channelChunks = chunk(youtubeChannels, YOUTUBE_API_CHUNK_SIZE);

  for (const channelChunk of channelChunks) {
    const channelIds = channelChunk.map((channel) => channel.platformId);

    if (channelIds.length === 0) {
      continue;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds.join(",")}`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.YOUTUBE_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch YouTube data:", await response.text());
      continue;
    }

    const data = await response.json().then((r) => r.items);
    const channels = z.array(youtubeChannelSchema).parse(data);

    const updateChunks = chunk(channels, 10);

    for (const updateChunk of updateChunks) {
      await Promise.all(
        updateChunk.map(async (channel) => {
          const partnerPlatform = channelChunk.find(
            (p) => p.platformId === channel.id,
          );

          if (!partnerPlatform) {
            return;
          }

          const newStats = {
            subscribers: channel.statistics.subscriberCount,
            posts: channel.statistics.videoCount,
            views: channel.statistics.viewCount,
            avatarUrl: channel.snippet?.thumbnails?.default?.url ?? null,
            ...(channel.snippet?.customUrl && {
              identifier: channel.snippet.customUrl.replace("@", ""),
            }),
          };

          const hasChanges =
            partnerPlatform.subscribers !== BigInt(newStats.subscribers) ||
            partnerPlatform.posts !== BigInt(newStats.posts) ||
            partnerPlatform.views !== BigInt(newStats.views) ||
            partnerPlatform.avatarUrl !== newStats.avatarUrl ||
            ("identifier" in newStats &&
              partnerPlatform.identifier !== newStats.identifier);

          if (!hasChanges) {
            console.log(
              `No changes to update for @${partnerPlatform.identifier}, skipping...`,
            );
            return;
          }

          await prisma.partnerPlatform.update({
            where: {
              id: partnerPlatform.id,
            },
            data: {
              ...newStats,
              lastCheckedAt: new Date(),
            },
          });

          console.log(
            `Updated YouTube stats for @${partnerPlatform.identifier}`,
            newStats,
          );
        }),
      );
    }
  }

  if (youtubeChannels.length === BATCH_SIZE) {
    startingAfter = youtubeChannels[youtubeChannels.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-platforms/youtube`,
      method: "POST",
      body: {
        startingAfter,
      },
    });

    return logAndRespond(
      `Processed ${BATCH_SIZE} YouTube channels. Scheduled next batch (startingAfter: ${startingAfter}).`,
    );
  }

  return logAndRespond(
    `Finished updating YouTube stats for ${youtubeChannels.length} partners.`,
  );
});
