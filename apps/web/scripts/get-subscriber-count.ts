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

  const handles = ["efficientapp", "stey", "hubermanlab"];

  try {
    // First get the channel IDs
    const channelIds = await getChannelIds(handles);
    console.log("Found channel IDs:", channelIds);

    // Then get the statistics for all channels
    const response = await youtube.channels.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ["statistics", "snippet"],
      id: channelIds,
    });

    // Log data for each channel
    response.data.items?.forEach((channel) => {
      console.log(
        `\nChannel: @${channel.snippet?.customUrl || channel.snippet?.title}`,
      );
      console.log("Subscriber count:", channel.statistics?.subscriberCount);
      console.log("View count:", channel.statistics?.viewCount);
      console.log("Video count:", channel.statistics?.videoCount);
    });
  } catch (error) {
    console.error("Error fetching channel data:", error);
  }
}

main();
