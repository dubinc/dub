"use server";

import { upsertPartnerPlatform } from "@/lib/api/partner-profile/upsert-partner-platform";
import { generateOTP } from "@/lib/auth/utils";
import {
  sanitizeSocialHandle,
  SOCIAL_PLATFORM_CONFIGS,
} from "@/lib/social-utils";
import { ratelimit } from "@/lib/upstash/ratelimit";
import { redis } from "@/lib/upstash/redis";
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

    // Rate limit check
    const { success } = await ratelimit(5, "1 h").limit(
      `social-verification:${partner.id}:${platform}`,
    );

    if (!success) {
      throw new Error(
        "Too many verification attempts. Please try again later.",
      );
    }

    // When the platform is website
    if (platform === "website") {
      const websiteTxtRecord = `dub-domain-verification=${uuid()}`;

      await upsertPartnerPlatform({
        where: {
          partnerId: partner.id,
          platform: "website",
        },
        data: {
          handle: rawHandle,
          verifiedAt: null,
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
    const handle = sanitizeSocialHandle(rawHandle, platform);

    if (!handle) {
      throw new Error(
        `Please enter a valid handle for ${platformConfig.name}.`,
      );
    }

    const verificationCode = generateOTP();
    const cacheKey = `social-verification:${partner.id}:${platform}:${handle}`;
    await redis.set(cacheKey, verificationCode, {
      ex: 60 * 60 * 24, // 24 hours,
    });

    await upsertPartnerPlatform({
      where: {
        partnerId: partner.id,
        platform,
      },
      data: {
        handle,
        verifiedAt: null,
      },
    });

    return {
      verificationCode,
    };
  });
