import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { chunk, deepEqual } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
    This route is used to update youtube stats for youtubeVerified partners
    Runs once a day at 12:00 AM UTC (cron expression: 0 0 * * *)
*/
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY is not defined");
    }

    const youtubeVerifiedPartners = await prisma.partner.findMany({
      where: {
        youtubeChannelId: {
          not: null,
        },
        youtubeVerifiedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        youtube: true,
        youtubeChannelId: true,
        youtubeSubscriberCount: true,
        youtubeVideoCount: true,
        youtubeViewCount: true,
      },
    });

    const chunks = chunk(youtubeVerifiedPartners, 50);

    for (const chunk of chunks) {
      const channelIds = chunk.map(
        (partner) => partner.youtubeChannelId as string,
      );

      if (channelIds.length === 0) continue;

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

      for (const d of data) {
        const partner = chunk.find((p) => p.youtubeChannelId === d.id);

        if (!partner || !d.statistics) {
          continue;
        }

        const { viewCount, subscriberCount, videoCount } = d.statistics;

        // Only compare the YouTube stats
        const currentStats = {
          youtubeSubscriberCount: partner.youtubeSubscriberCount,
          youtubeVideoCount: partner.youtubeVideoCount,
          youtubeViewCount: partner.youtubeViewCount,
        };

        const newStats = {
          youtubeSubscriberCount: parseInt(subscriberCount || "0", 10),
          youtubeVideoCount: parseInt(videoCount || "0", 10),
          youtubeViewCount: parseInt(viewCount || "0", 10),
        };

        if (deepEqual(currentStats, newStats)) {
          continue;
        }

        await prisma.partner.update({
          where: { id: partner.id },
          data: newStats,
        });
        console.log(
          `Updated YouTube stats for ${partner.email} (@${partner.youtube})`,
          newStats,
        );
      }
    }

    return NextResponse.json({
      message: `YouTube stats updated for ${youtubeVerifiedPartners.length} partners`,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
