"use server";

import { scrapeCreatorsClient } from "@/lib/api/scrapecreators/client";
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

    // Get the verification code from Redis
    const cacheKey = `social-verification:${partner.id}:${platform}:${handle}`;
    const verificationCode = await redis.get<string>(cacheKey);

    if (!verificationCode) {
      throw new Error(
        "Verification code not found or expired. Please start verification again.",
      );
    }

    // Verify the code using ScrapeCreators API
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

    // Update the partner's verification status
    const verifiedAtField = `${platform}VerifiedAt` as
      | "youtubeVerifiedAt"
      | "instagramVerifiedAt"
      | "tiktokVerifiedAt"
      | "linkedinVerifiedAt";

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        [verifiedAtField]: new Date(),
        [platform]: handle,
      },
    });

    // Delete the verification code from Redis
    await redis.del(cacheKey);

    return {
      verifiedAt: new Date(),
    };
  });
