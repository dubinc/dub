import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import { chunk } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

const youtubeChannelSchema = z.object({
  id: z.string(),
  statistics: z.object({
    videoCount: z.string().transform((val) => parseInt(val, 10)),
    subscriberCount: z.string().transform((val) => parseInt(val, 10)),
    viewCount: z.string().transform((val) => parseInt(val, 10)),
  }),
});

export const dynamic = "force-dynamic";

/**
 * This route is used to update stats for YouTube verified partners using the YouTube API
 * Runs once a day at 06:00 AM UTC (cron expression: 0 6 * * *)
 * POST /api/cron/partner-platforms/youtube
 */
export const POST = withCron(async () => {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not defined");
  }

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
  });

  if (youtubeChannels.length === 0) {
    return logAndRespond(
      "No YouTube platforms found. Skipping YouTube stats update.",
    );
  }

  const chunks = chunk(youtubeChannels, 50);

  for (const chunk of chunks) {
    const channelIds = chunk.map((channel) => channel.platformId);

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

    for (const channel of channels) {
      const partnerPlatform = chunk.find((p) => p.platformId === channel.id);

      if (!partnerPlatform) {
        continue;
      }

      const currentStats = {
        subscribers: partnerPlatform.subscribers,
        posts: partnerPlatform.posts,
        views: partnerPlatform.views,
      };

      const newStats = {
        subscribers: channel.statistics.subscriberCount,
        posts: channel.statistics.videoCount,
        views: channel.statistics.viewCount,
      };

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
    }
  }

  return logAndRespond(
    `YouTube stats updated for ${youtubeChannels.length} partners`,
  );
});
