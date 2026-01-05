"use server";

import { scrapeCreatorsClient } from "@/lib/api/scrapecreators/client";
import { ratelimit } from "@/lib/upstash";
import { redis } from "@/lib/upstash/redis";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const verifySocialAccountSchema = z.object({
  platform: z.enum(["youtube", "instagram", "tiktok", "linkedin"]),
  handle: z.string().min(1),
});

export const verifySocialAccountAction = authPartnerActionClient
  .schema(verifySocialAccountSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { platform, handle } = parsedInput;

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

    // Verify the social account
    const isValid = await scrapeCreatorsClient.verifyAccount({
      platform,
      handle,
      code: verificationCode,
    });

    if (!isValid) {
      throw new Error(
        `Verification code not found in your ${platform} ${platform === "youtube" ? "channel description" : "bio"}. Please make sure you've added the code and try again.`,
      );
    }

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        [`${platform}VerifiedAt`]: new Date(),
        [platform]: handle,
      },
    });

    // Delete the verification code from Redis
    await redis.del(cacheKey);

    return {
      verifiedAt: new Date(),
    };
  });
