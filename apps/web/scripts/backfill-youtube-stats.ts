import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { google } from "googleapis";

const youtube = google.youtube("v3");

// First, we need to get the channel IDs from the handles
async function getChannelIds(handles: string[]) {
  const channelIds = await Promise.all(
    handles.map(async (handle) => {
      const response = await youtube.channels.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ["id"],
        forHandle: handle,
      });
      return response.data.items?.[0]?.id;
    }),
  );
  return channelIds.filter(Boolean) as string[];
}

async function main() {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("Missing YouTube API key");
  }

  const youtubeVerifiedPartners = await prisma.partner.findMany({
    where: {
      youtube: {
        not: null,
      },
      youtubeVerifiedAt: {
        not: null,
      },
      youtubeChannelId: null,
    },
    select: {
      id: true,
      youtube: true,
    },
    take: 10,
  });

  try {
    // First get the channel IDs
    const channelIds = await getChannelIds(
      youtubeVerifiedPartners.map((partner) => partner.youtube as string),
    );
    console.log("Found channel IDs:", channelIds);

    // Then get the statistics for all channels
    const response = await youtube.channels.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ["statistics", "snippet"],
      id: channelIds,
    });

    const stats = response.data.items;

    if (!stats) {
      return;
    }

    for (const stat of stats) {
      const partner = youtubeVerifiedPartners.find(
        (p) => p.youtube === stat.snippet?.customUrl,
      );

      if (!partner || !stat.statistics) {
        continue;
      }

      const { viewCount, subscriberCount, videoCount } = stat.statistics;

      await prisma.partner.update({
        where: { id: partner.id },
        data: {
          youtubeChannelId: stat.id,
          youtubeSubscriberCount: parseInt(subscriberCount || "0", 10),
          youtubeVideoCount: parseInt(videoCount || "0", 10),
          youtubeViewCount: parseInt(viewCount || "0", 10),
        },
      });

      console.log(`Updated ${partner.youtube} with stats`, {
        youtubeChannelId: stat.id,
        youtubeSubscriberCount: parseInt(subscriberCount || "0", 10),
        youtubeVideoCount: parseInt(videoCount || "0", 10),
        youtubeViewCount: parseInt(viewCount || "0", 10),
      });
    }
  } catch (error) {
    console.error("Error fetching channel data:", error);
  }
}

main();
