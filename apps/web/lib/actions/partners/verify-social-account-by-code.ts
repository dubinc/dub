"use server";

import { scrapeCreatorsClient } from "@/lib/api/scrapecreators/client";
import { ratelimit } from "@/lib/upstash";
import { redis } from "@/lib/upstash/redis";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  platform: z.enum(PlatformType),
  handle: z.string().min(1),
});

// Verify social accounts using the verification code
export const verifySocialAccountByCodeAction = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { platform, handle } = parsedInput;

    if (!["youtube", "instagram"].includes(platform)) {
      throw new Error("Only YouTube and Instagram are supported.");
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

    // Verifies that a verification code exists in the account's profile bio/description.
    // Fetches the account profile and checks if the provided code appears in any of the
    // profile text fields (description, about, bio, summary).
    const socialProfile = await scrapeCreatorsClient.fetchSocialProfile({
      platform,
      handle,
    });

    if (!socialProfile) {
      throw new Error(
        "We were unable to retrieve your social media profile. Please try again.",
      );
    }

    if (!socialProfile.description) {
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
      },
    });

    // Delete the verification code from Redis
    await redis.del(cacheKey);
  });
