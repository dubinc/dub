import { assertEnv } from "@/lib/assert-env";
import { HttpBaseClient } from "@/lib/http/base-client";
import { getChannelsInputSchema, getChannelsOutputSchema } from "./schema";

class YouTubeClient extends HttpBaseClient {
  protected readonly vendor = "YouTube";
  protected readonly baseUrl = "https://www.googleapis.com/youtube/v3";

  protected buildAuthHeaders() {
    return {
      "X-Goog-Api-Key": assertEnv("YOUTUBE_API_KEY"),
    };
  }

  // GET /youtube/v3/channels
  async getChannels(channelIds: string[]) {
    return await this.get("/channels", {
      input: {
        part: "statistics,snippet",
        id: channelIds.join(","),
      },
      inputSchema: getChannelsInputSchema,
      outputSchema: getChannelsOutputSchema,
    });
  }
}

export const youtubeClient = new YouTubeClient();
