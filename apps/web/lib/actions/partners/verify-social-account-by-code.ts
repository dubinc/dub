"use server";

import { getLinkedInPost } from "@/lib/api/scrape-creators/get-linkedin-post";
import { getSocialProfile } from "@/lib/api/scrape-creators/get-social-profile";
import { ratelimit } from "@/lib/upstash";
import { redis } from "@/lib/upstash/redis";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  platform: z.enum(PlatformType),
  handle: z.string().min(1),
  postUrl: z.url().optional(),
});

// Verify social accounts using the verification code
export const verifySocialAccountByCodeAction = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { platform, handle, postUrl } = parsedInput;

    if (!["youtube", "instagram", "linkedin"].includes(platform)) {
      throw new Error("Only YouTube, Instagram, and LinkedIn are supported.");
    }

    if (platform === "linkedin" && !postUrl) {
      throw new Error("Please provide the LinkedIn post URL.");
    }

    // Rate limit check
    const { success } = await ratelimit(5, "1 h").limit(
      `social-verification:${partner.id}:${platform}`,
    );

    if (!success) {
      throw new Error(
        "Too many verification attempts. Please try again later.",
      );
    }

    // Get the verification code from Redis
    const cacheKey = `social-verification:${partner.id}:${platform}:${handle}`;
    const verificationCode = await redis.get<string>(cacheKey);

    if (!verificationCode) {
      throw new Error(
        "Verification code not found or expired. Please start verification again.",
      );
    }

    // Check if the account is already verified
    const partnerPlatform = await prisma.partnerPlatform.findUnique({
      where: {
        partnerId_type: {
          partnerId: partner.id,
          type: platform,
        },
      },
      select: {
        identifier: true,
        verifiedAt: true,
      },
    });

    if (!partnerPlatform) {
      throw new Error("Social account not found. Please restart verification.");
    }

    // No further action is needed if the account is already verified
    if (
      partnerPlatform?.identifier?.toLowerCase() === handle.toLowerCase() &&
      partnerPlatform.verifiedAt
    ) {
      return;
    }

    if (platform === "linkedin") {
      // For LinkedIn, fetch the post and check for the verification code
      const linkedInPost = await getLinkedInPost(postUrl!);

      if (!linkedInPost.description || linkedInPost.description.length === 0) {
        throw new Error(
          "We could not find any text content in the LinkedIn post. Please ensure it is visible and try again.",
        );
      }

      if (!linkedInPost.description.includes(verificationCode)) {
        throw new Error(
          "The verification code was not found in the LinkedIn post. Please add the code exactly as provided and try again.",
        );
      }

      // Verify the post author matches the stored handle
      const authorUrl = linkedInPost.author.url?.toLowerCase() ?? "";
      const authorSlug = authorUrl.match(/\/in\/([^/?]+)/)?.[1];

      if (
        !authorSlug ||
        authorSlug !== partnerPlatform.identifier.toLowerCase()
      ) {
        throw new Error(
          "The LinkedIn post does not appear to belong to the account you are verifying. Please ensure you are sharing a post from the correct account.",
        );
      }

      await prisma.partnerPlatform.update({
        where: {
          partnerId_type: {
            partnerId: partner.id,
            type: platform,
          },
        },
        data: {
          verifiedAt: new Date(),
          subscribers: BigInt(linkedInPost.author.followers),
        },
      });

      await redis.del(cacheKey);
      return;
    }

    // For YouTube and Instagram, verify code in profile description
    const socialProfile = await getSocialProfile({
      platform,
      handle,
    });

    if (!socialProfile.description || socialProfile.description.length === 0) {
      throw new Error(
        `We could not find a public ${
          platform === "youtube" ? "channel description" : "bio"
        } for this account. Please ensure it is visible and try again.`,
      );
    }

    const isValid = socialProfile.description.includes(verificationCode);

    if (!isValid) {
      throw new Error(
        `The verification code was not found in your ${
          platform === "youtube" ? "channel description" : "bio"
        }. Please add the code exactly as provided, save your changes, and try again.`,
      );
    }

    await prisma.partnerPlatform.update({
      where: {
        partnerId_type: {
          partnerId: partner.id,
          type: platform,
        },
      },
      data: {
        verifiedAt: new Date(),
        platformId: socialProfile.platformId,
        subscribers: socialProfile.subscribers,
        posts: socialProfile.posts,
        views: socialProfile.views,
        avatarUrl: socialProfile.avatarUrl,
      },
    });

    await redis.del(cacheKey);
  });
