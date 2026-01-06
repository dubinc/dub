"use server";

import { upsertPartnerPlatform } from "@/lib/api/partner-profile/upsert-partner-platform";
import { scrapeCreatorsClient } from "@/lib/api/scrapecreators/client";
import { ratelimit } from "@/lib/upstash";
import { redis } from "@/lib/upstash/redis";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const verifySocialAccountSchema = z.object({
  platform: z.enum(["youtube", "instagram"]),
  handle: z.string().min(1),
});

// Verify social accounts using the verification code
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

    // Check if the account is already verified
    const partnerPlatform = await prisma.partnerPlatform.findUnique({
      where: {
        partnerId_platform: {
          partnerId: partner.id,
          platform,
        },
      },
      select: {
        handle: true,
        verifiedAt: true,
      },
    });

    // No futher action is needed if the account is already verified
    if (
      partnerPlatform?.handle?.toLowerCase() === handle.toLowerCase() &&
      partnerPlatform.verifiedAt
    ) {
      return;
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

    await upsertPartnerPlatform({
      where: {
        partnerId: partner.id,
        platform,
      },
      data: {
        handle,
        verifiedAt: new Date(),
      },
    });

    // Delete the verification code from Redis
    await redis.del(cacheKey);

    return {
      verifiedAt: new Date(),
    };
  });
