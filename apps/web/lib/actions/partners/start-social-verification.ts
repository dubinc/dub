"use server";

import { generateOTP } from "@/lib/auth/utils";
import {
  sanitizeSocialHandle,
  SOCIAL_PLATFORM_CONFIGS,
} from "@/lib/social-utils";
import { ratelimit } from "@/lib/upstash/ratelimit";
import { redis } from "@/lib/upstash/redis";
import { prisma } from "@dub/prisma";
import { SocialPlatform } from "@dub/prisma/client";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const startSocialVerificationSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  handle: z.string().min(1).max(50),
});

export const startSocialVerificationAction = authPartnerActionClient
  .schema(startSocialVerificationSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { platform, handle: rawHandle } = parsedInput;

    // When the platform is website
    if (platform === "website") {
      const websiteTxtRecord = `dub-domain-verification=${uuid()}`;

      await prisma.partnerPlatform.upsert({
        where: {
          partnerId_platform: {
            partnerId: partner.id,
            platform: "website",
          },
        },
        create: {
          partnerId: partner.id,
          platform: "website",
          handle: rawHandle,
          metadata: {
            websiteTxtRecord,
          },
        },
        update: {
          handle: rawHandle,
          metadata: {
            websiteTxtRecord,
          },
        },
      });

      return {
        websiteTxtRecord,
      };
    }

    // For all other social platforms
    const platformConfig = SOCIAL_PLATFORM_CONFIGS[platform];

    if (
      rawHandle.toLowerCase() === partner[platform]?.toLowerCase() &&
      partner[`${platform}VerifiedAt`]
    ) {
      throw new Error(
        `Your ${platformConfig.name} account already verified. No further verification needed.`,
      );
    }

    const handle = sanitizeSocialHandle(rawHandle, platform);

    if (!handle) {
      throw new Error(
        `Please enter a valid handle for ${platformConfig.name}.`,
      );
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

    const verificationCode = generateOTP();

    const cacheKey = `social-verification:${partner.id}:${platform}:${handle}`;
    await redis.set(cacheKey, verificationCode, {
      ex: 60 * 10, // 10 minutes,
    });

    return {
      verificationCode,
    };
  });
