import { ONLINE_PRESENCE_PROVIDERS } from "@/lib/actions/partners/online-presence-providers";
import { upsertPartnerPlatform } from "@/lib/api/partner-profile/upsert-partner-platform";
import { prisma } from "@dub/prisma";
import { PARTNERS_DOMAIN, PARTNERS_DOMAIN_WITH_NGROK } from "@dub/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET - /api/partners/online-presence/callback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code") as string;
  const state = searchParams.get("state") as string;

  if (!state) {
    console.warn("No state found in OAuth callback");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  let stateObject: any = {};

  try {
    stateObject = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
  } catch (e) {
    console.warn("Failed to parse state in OAuth callback");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  const { provider, partnerId, source } = stateObject;
  const redirectUrl = getRedirectUrl(source);

  if (!code) {
    console.warn("No code found in OAuth callback");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    if (!provider || !ONLINE_PRESENCE_PROVIDERS?.[provider]) {
      console.error("No provider found in OAuth callback state");
      return NextResponse.redirect(redirectUrl);
    }

    if (!partnerId) {
      console.error("No partnerId found in OAuth callback state");
      return NextResponse.redirect(redirectUrl);
    }

    const { tokenUrl, clientId, clientSecret, verify, pkce, clientIdParam } =
      ONLINE_PRESENCE_PROVIDERS[provider];

    const codeVerifier = pkce
      ? (await cookies()).get("online_presence_code_verifier")?.value
      : null;

    // Local development redirect since the verifier cookie won't be present on ngrok
    if (pkce && !codeVerifier && process.env.NODE_ENV === "development") {
      return NextResponse.redirect(
        `http://partners.localhost:8888/api/partners/online-presence/callback?${searchParams.toString()}`,
      );
    }

    // Get access token
    const result = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        [clientIdParam ?? "client_id"]: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: `${PARTNERS_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback`,
        grant_type: "authorization_code",
        ...(codeVerifier && { code_verifier: codeVerifier }),
      }).toString(),
    }).then(async (r) => {
      const text = await r.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse access token response", text);
        throw e;
      }
    });

    if (!result || !result.access_token) {
      console.warn("No access token found in OAuth callback");
      return NextResponse.redirect(redirectUrl);
    }

    const partner = await prisma.partner.findUniqueOrThrow({
      where: {
        id: partnerId,
      },
      include: {
        platforms: true,
      },
    });

    // Get the handle from PartnerPlatform
    const partnerPlatform = partner.platforms.find(
      (p) => p.platform === provider,
    );
    const handle = partnerPlatform?.handle;

    if (!handle) {
      console.error("No handle found for platform in OAuth callback");
      return NextResponse.redirect(redirectUrl);
    }

    // Create a partner object with the handle for the verify function
    // The verify function expects the old partner model structure
    const partnerForVerify = {
      ...partner,
      [provider]: handle,
    } as typeof partner & { [key: string]: string | null };

    const { verified: isVerified, metadata } = await verify({
      partner: partnerForVerify,
      accessToken: result.access_token,
    });

    if (isVerified) {
      await upsertPartnerPlatform({
        where: {
          partnerId: partner.id,
          platform: provider,
        },
        data: {
          handle,
          verifiedAt: new Date(),
          metadata: metadata || undefined,
        },
      });
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in online presence OAuth callback", error);
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }
}

const getRedirectUrl = (source: string) =>
  source === "onboarding"
    ? `${PARTNERS_DOMAIN}/onboarding/online-presence`
    : `${PARTNERS_DOMAIN}/profile`;
