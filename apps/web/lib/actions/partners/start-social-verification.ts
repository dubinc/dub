"use server";

import { ONLINE_PRESENCE_PROVIDERS } from "@/lib/actions/partners/online-presence-providers";
import {
  generateCodeChallengeHash,
  generateCodeVerifier,
} from "@/lib/api/oauth/utils";
import { upsertPartnerPlatform } from "@/lib/api/partner-profile/upsert-partner-platform";
import { generateOTP } from "@/lib/auth/utils";
import {
  sanitizeSocialHandle,
  SOCIAL_PLATFORM_CONFIGS,
} from "@/lib/social-utils";
import { ratelimit } from "@/lib/upstash/ratelimit";
import { redis } from "@/lib/upstash/redis";
import { SocialPlatform } from "@dub/prisma/client";
import { PARTNERS_DOMAIN_WITH_NGROK } from "@dub/utils";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const startSocialVerificationSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  handle: z.string().min(1).max(50),
  source: z.enum(["onboarding", "settings"]).default("onboarding"),
});

type VerificationResult =
  | { type: "oauth"; oauthUrl: string }
  | { type: "verification_code"; verificationCode: string }
  | { type: "txt_record"; websiteTxtRecord: string };

type VerificationParams = {
  partnerId: string;
  platform: SocialPlatform;
  handle: string;
  source: "onboarding" | "settings";
};

export const startSocialVerificationAction = authPartnerActionClient
  .schema(startSocialVerificationSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { platform, handle: rawHandle, source } = parsedInput;

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
      handle: rawHandle,
      source,
    };

    if (platform === "website") {
      return startWebsiteVerification(params);
    }

    const oauthProvider = ONLINE_PRESENCE_PROVIDERS[platform];
    if (oauthProvider && oauthProvider.clientId) {
      return startOAuthVerification(params);
    }

    // Default to verification code flow
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
      platform: "website",
    },
    data: {
      handle,
      verifiedAt: null,
      metadata: {
        websiteTxtRecord,
      },
    },
  });

  return {
    type: "txt_record" as const,
    websiteTxtRecord,
  };
}

// Start OAuth verification for platforms like Twitter and TikTok
async function startOAuthVerification({
  partnerId,
  platform,
  handle: rawHandle,
  source,
}: VerificationParams): Promise<
  Extract<VerificationResult, { type: "oauth" }>
> {
  const oauthProvider = ONLINE_PRESENCE_PROVIDERS[platform];
  if (!oauthProvider || !oauthProvider.clientId) {
    throw new Error(`OAuth provider not configured for ${platform}`);
  }

  const platformConfig = SOCIAL_PLATFORM_CONFIGS[platform];
  const handle = sanitizeSocialHandle(rawHandle, platform);

  if (!handle) {
    throw new Error(`Please enter a valid handle for ${platformConfig.name}.`);
  }

  // Store handle before OAuth redirect
  await upsertPartnerPlatform({
    where: {
      partnerId,
      platform,
    },
    data: {
      handle,
      verifiedAt: null,
    },
  });

  // Generate OAuth authorization URL
  const state = Buffer.from(
    JSON.stringify({
      provider: platform,
      partnerId,
      source,
    }),
  ).toString("base64");

  const params: Record<string, string> = {
    [oauthProvider.clientIdParam ?? "client_id"]: oauthProvider.clientId,
    redirect_uri: `${PARTNERS_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback`,
    scope: oauthProvider.scopes,
    response_type: "code",
    state,
  };

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

    params.code_challenge = codeChallenge;
    params.code_challenge_method = "S256";
  }

  const oauthUrl = `${oauthProvider.authUrl}?${new URLSearchParams(params).toString()}`;

  return {
    type: "oauth" as const,
    oauthUrl,
  };
}

// Start verification code flow for platforms like YouTube, Instagram, LinkedIn
async function startCodeVerification({
  partnerId,
  platform,
  handle: rawHandle,
}: Pick<VerificationParams, "partnerId" | "platform" | "handle">): Promise<
  Extract<VerificationResult, { type: "verification_code" }>
> {
  const platformConfig = SOCIAL_PLATFORM_CONFIGS[platform];
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
      platform,
    },
    data: {
      handle,
      verifiedAt: null,
    },
  });

  return {
    type: "verification_code" as const,
    verificationCode,
  };
}
