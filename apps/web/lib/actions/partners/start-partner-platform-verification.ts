"use server";

import {
  generateCodeChallengeHash,
  generateCodeVerifier,
} from "@/lib/api/oauth/utils";
import { PARTNER_PLATFORMS_PROVIDERS } from "@/lib/api/partner-profile/partner-platforms-providers";
import { upsertPartnerPlatform } from "@/lib/api/partner-profile/upsert-partner-platform";
import { generateOTP } from "@/lib/auth/utils";
import {
  sanitizeSocialHandle,
  SOCIAL_PLATFORM_CONFIGS,
} from "@/lib/social-utils";
import { ratelimit } from "@/lib/upstash/ratelimit";
import { redis } from "@/lib/upstash/redis";
import { PlatformType } from "@dub/prisma/client";
import { nanoid, PARTNERS_DOMAIN_WITH_NGROK } from "@dub/utils";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const startPartnerPlatformVerificationSchema = z.object({
  platform: z.enum(PlatformType),
  handle: z.string().min(1).max(50),
  source: z.enum(["onboarding", "settings"]).default("onboarding"),
});

type VerificationResult =
  | { type: "oauth"; oauthUrl: string }
  | { type: "verification_code"; verificationCode: string }
  | { type: "txt_record"; websiteTxtRecord: string };

type VerificationParams = {
  partnerId: string;
  platform: PlatformType;
  handle: string;
  source: "onboarding" | "settings";
};

/**
 * Starts the social platform verification process for a partner.
 * Supports three verification methods:
 * - OAuth: For platforms like Twitter, TikTok, and LinkedIn (returns OAuth URL)
 * - Verification Code: For platforms like YouTube and Instagram (returns code to display)
 * - TXT Record: For website verification (returns DNS TXT record)
 */
export const startPartnerPlatformVerificationAction = authPartnerActionClient
  .inputSchema(startPartnerPlatformVerificationSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { platform, handle, source } = parsedInput;

    // Rate limit check
    const { success } = await ratelimit(5, "1 h").limit(
      `social-verification:${partner.id}:${platform}`,
    );

    if (!success) {
      throw new Error(
        "Too many verification attempts. Please try again later.",
      );
    }

    const params: VerificationParams = {
      partnerId: partner.id,
      platform,
      handle,
      source,
    };

    // For website
    if (platform === "website") {
      return startWebsiteVerification(params);
    }

    // For OAuth based verification
    const oauthProvider = PARTNER_PLATFORMS_PROVIDERS[platform];
    if (oauthProvider) {
      return startOAuthVerification(params);
    }

    // For code based verification
    return startCodeVerification(params);
  });

// Start website verification using TXT record
async function startWebsiteVerification({
  partnerId,
  handle,
}: Pick<VerificationParams, "partnerId" | "handle">): Promise<
  Extract<VerificationResult, { type: "txt_record" }>
> {
  const websiteTxtRecord = `dub-domain-verification=${uuid()}`;

  await upsertPartnerPlatform({
    where: {
      partnerId,
      type: "website",
    },
    data: {
      identifier: handle,
      verifiedAt: null,
      metadata: {
        websiteTxtRecord,
      },
    },
  });

  return {
    type: "txt_record",
    websiteTxtRecord,
  };
}

// Start OAuth verification for platforms Twitter, TikTok and LinkedIn
async function startOAuthVerification({
  partnerId,
  platform,
  handle: rawHandle,
  source,
}: VerificationParams): Promise<
  Extract<VerificationResult, { type: "oauth" }>
> {
  const oauthProvider = PARTNER_PLATFORMS_PROVIDERS[platform];
  if (!oauthProvider || !oauthProvider.clientId) {
    throw new Error(`OAuth provider not configured for ${platform}`);
  }

  const platformConfig = SOCIAL_PLATFORM_CONFIGS[platform];

  if (!platformConfig) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const handle = sanitizeSocialHandle(rawHandle, platform);

  if (!handle) {
    throw new Error(`Please enter a valid handle for ${platformConfig.name}.`);
  }

  // Store handle before OAuth redirect
  await upsertPartnerPlatform({
    where: {
      partnerId,
      type: platform,
    },
    data: {
      identifier: handle,
      verifiedAt: null,
    },
  });

  // Generate OAuth authorization URL
  const state = nanoid(16);
  await redis.set(
    `partnerSocialVerification:${state}`,
    {
      platform,
      partnerId,
      source,
    },
    {
      ex: 5 * 60, // 5 minutes
    },
  );

  const searchParams = new URLSearchParams({
    [oauthProvider.clientIdParam ?? "client_id"]: oauthProvider.clientId,
    redirect_uri: `${PARTNERS_DOMAIN_WITH_NGROK}/api/partners/platforms/callback`,
    scope: oauthProvider.scopes,
    response_type: "code",
    state,
  });

  // Handle PKCE for platforms that require it (e.g., Twitter)
  if (oauthProvider.pkce) {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallengeHash(codeVerifier);

    // Store code verifier in cookie for callback
    (await cookies()).set("online_presence_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5, // 5 minutes
    });

    searchParams.set("code_challenge", codeChallenge);
    searchParams.set("code_challenge_method", "S256");
  }

  const oauthUrl = `${oauthProvider.authUrl}?${searchParams.toString()}`;

  return {
    type: "oauth",
    oauthUrl,
  };
}

// Start verification code flow for platforms like YouTube, Instagram
async function startCodeVerification({
  partnerId,
  platform,
  handle: rawHandle,
}: Pick<VerificationParams, "partnerId" | "platform" | "handle">): Promise<
  Extract<VerificationResult, { type: "verification_code" }>
> {
  const platformConfig = SOCIAL_PLATFORM_CONFIGS[platform];

  if (!platformConfig) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const handle = sanitizeSocialHandle(rawHandle, platform);

  if (!handle) {
    throw new Error(`Please enter a valid handle for ${platformConfig.name}.`);
  }

  const verificationCode = generateOTP();
  const cacheKey = `social-verification:${partnerId}:${platform}:${handle}`;
  await redis.set(cacheKey, verificationCode, {
    ex: 60 * 60 * 24, // 24 hours
  });

  await upsertPartnerPlatform({
    where: {
      partnerId,
      type: platform,
    },
    data: {
      identifier: handle,
      verifiedAt: null,
    },
  });

  return {
    type: "verification_code",
    verificationCode,
  };
}
