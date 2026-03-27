import { getLinkedInPost } from "@/lib/api/scrape-creators/get-linkedin-post";
import { getSocialProfile } from "@/lib/api/scrape-creators/get-social-profile";
import { withAdmin } from "@/lib/auth";
import { sanitizeSocialHandle, sanitizeWebsite } from "@/lib/social-utils";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const postSchema = z.object({
  partnerId: z.string().trim().min(1),
  platform: z.enum(PlatformType),
  identifier: z.string().trim().min(1),
  postUrl: z.string().trim().url().optional(),
});

// POST /api/admin/partners/platforms
export const POST = withAdmin(
  async ({ req }) => {
    const { partnerId, platform, identifier: rawIdentifier, postUrl } = postSchema
      .parse(await req.json());

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    const identifier =
      platform === "website"
        ? sanitizeWebsite(rawIdentifier)
        : sanitizeSocialHandle(rawIdentifier, platform);

    if (!identifier) {
      return new Response("Invalid platform identifier.", { status: 400 });
    }

    let verifiedData: {
      platformId: string | null;
      subscribers: bigint;
      posts: bigint;
      views: bigint;
      avatarUrl: string | null;
      metadata?: Record<string, string | number>;
    } = {
      platformId: null,
      subscribers: BigInt(0),
      posts: BigInt(0),
      views: BigInt(0),
      avatarUrl: null,
      metadata: {},
    };

    if (["youtube", "instagram", "twitter", "tiktok"].includes(platform)) {
      const socialProfile = await getSocialProfile({
        platform,
        handle: identifier,
      });

      verifiedData = {
        platformId: socialProfile.platformId,
        subscribers: socialProfile.subscribers,
        posts: socialProfile.posts,
        views: socialProfile.views,
        avatarUrl: socialProfile.avatarUrl,
      };
    } else if (platform === "linkedin" && postUrl) {
      const linkedInPost = await getLinkedInPost(postUrl);
      verifiedData = {
        platformId: null,
        subscribers: BigInt(linkedInPost.author.followers || 0),
        posts: BigInt(0),
        views: BigInt(0),
        avatarUrl: null,
        metadata: {
          linkedInPostUrl: postUrl,
          linkedInAuthorUrl: linkedInPost.author.url ?? "",
        },
      };
    }

    const updated = await prisma.partnerPlatform.upsert({
      where: {
        partnerId_type: {
          partnerId,
          type: platform,
        },
      },
      create: {
        partnerId,
        type: platform,
        identifier,
        verifiedAt: new Date(),
        platformId: verifiedData.platformId,
        subscribers: verifiedData.subscribers,
        posts: verifiedData.posts,
        views: verifiedData.views,
        avatarUrl: verifiedData.avatarUrl,
        metadata: {
          ...(verifiedData.metadata ?? {}),
          manuallyVerifiedByAdmin: true,
          manuallyVerifiedAt: new Date().toISOString(),
        },
        lastCheckedAt: new Date(),
      },
      update: {
        identifier,
        verifiedAt: new Date(),
        platformId: verifiedData.platformId,
        subscribers: verifiedData.subscribers,
        posts: verifiedData.posts,
        views: verifiedData.views,
        avatarUrl: verifiedData.avatarUrl,
        metadata: {
          ...(verifiedData.metadata ?? {}),
          manuallyVerifiedByAdmin: true,
          manuallyVerifiedAt: new Date().toISOString(),
        },
        lastCheckedAt: new Date(),
      },
    });

    revalidatePath("/api/admin/partners");
    revalidatePath("/api/admin/partners/platforms");

    return NextResponse.json({
      platform: {
        ...updated,
        subscribers: Number(updated.subscribers),
        posts: Number(updated.posts),
        views: Number(updated.views),
      },
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
