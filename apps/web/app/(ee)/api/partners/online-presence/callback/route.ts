import { ONLINE_PRESENCE_PROVIDERS } from "@/lib/api/partner-profile/online-presence-providers";
import { getSession } from "@/lib/auth/utils";
import { redis } from "@/lib/upstash/redis";
import { prisma } from "@dub/prisma";
import { PlatformType } from "@dub/prisma/client";
import {
  getSearchParams,
  PARTNERS_DOMAIN,
  PARTNERS_DOMAIN_WITH_NGROK,
} from "@dub/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  code: z.string(),
  state: z.string(),
});

interface State {
  platform: PlatformType;
  partnerId: string;
  source: "onboarding" | "settings";
}

// GET /api/partners/online-presence/callback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Validate the request
  const parsedSearchParams = requestSchema.safeParse(getSearchParams(req.url));

  if (!parsedSearchParams.success) {
    console.warn("Missing required search params in OAuth callback.");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  const { code, state } = parsedSearchParams.data;

  // Get current user
  const session = await getSession();

  if (!session?.user?.id) {
    console.warn("Unauthorized: Login required.");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  // Find the state from Redis
  const stateFromRedis = await redis.get<State>(
    `partnerSocialVerification:${state}`,
  );

  if (!stateFromRedis) {
    console.warn("State is invalid or expired.");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  const { platform, partnerId, source } = stateFromRedis;

  if (session.user.defaultPartnerId !== partnerId) {
    console.warn("Unauthorized: User is not the default partner.");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  // Validate platform exists in providers
  const provider = ONLINE_PRESENCE_PROVIDERS[platform];
  if (!provider) {
    console.error(`Invalid platform: ${platform}`);
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  // Redirect user based on source
  const redirectUrl =
    source === "onboarding"
      ? `${PARTNERS_DOMAIN}/onboarding/online-presence`
      : `${PARTNERS_DOMAIN}/profile`;

  const { tokenUrl, clientId, clientSecret, verify, pkce, clientIdParam } =
    provider;

  const cookieStore = await cookies();
  const codeVerifier = pkce
    ? cookieStore.get("online_presence_code_verifier")?.value
    : null;

  // Local development redirect since the verifier cookie won't be present on ngrok
  if (pkce && !codeVerifier && process.env.NODE_ENV === "development") {
    return NextResponse.redirect(
      `http://partners.localhost:8888/api/partners/online-presence/callback?${searchParams.toString()}`,
    );
  }

  // Remove the state from Redis
  await redis.del(`partnerSocialVerification:${state}`);

  // Get access token
  const urlParams = new URLSearchParams({
    [clientIdParam ?? "client_id"]: clientId!,
    client_secret: clientSecret!,
    code,
    redirect_uri: `${PARTNERS_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback`,
    grant_type: "authorization_code",
    ...(codeVerifier && { code_verifier: codeVerifier }),
  });

  const response = await fetch(tokenUrl, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    method: "POST",
    body: urlParams.toString(),
  });

  const tokenResponse = await response.json();

  if (!response.ok) {
    console.warn("Failed to get access token in OAuth callback", tokenResponse);
    return NextResponse.redirect(redirectUrl);
  }

  if (!tokenResponse.access_token) {
    console.warn("No access token found in OAuth callback");
    return NextResponse.redirect(redirectUrl);
  }

  const partnerPlatform = await prisma.partnerPlatform.findUnique({
    where: {
      partnerId_type: {
        partnerId,
        type: platform,
      },
    },
  });

  if (!partnerPlatform || !partnerPlatform.identifier) {
    console.error("No partner platform found in OAuth callback");
    return NextResponse.redirect(redirectUrl);
  }

  const { verified, metadata } = await verify({
    handle: partnerPlatform.identifier,
    accessToken: tokenResponse.access_token,
  });

  if (!verified) {
    console.warn("Failed to verify social account in OAuth callback");
    return NextResponse.redirect(redirectUrl);
  }

  await prisma.partnerPlatform.update({
    where: {
      partnerId_type: {
        partnerId,
        type: platform,
      },
    },
    data: {
      verifiedAt: new Date(),
      metadata: metadata || undefined,
    },
  });

  // Delete PKCE code verifier cookie after successful use
  if (pkce && codeVerifier) {
    cookieStore.delete("online_presence_code_verifier");
  }

  return NextResponse.redirect(redirectUrl);
}
