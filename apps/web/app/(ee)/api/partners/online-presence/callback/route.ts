import { ONLINE_PRESENCE_PROVIDERS } from "@/lib/actions/partners/online-presence-providers";
import { prisma } from "@dub/prisma";
import { PARTNERS_DOMAIN, PARTNERS_DOMAIN_WITH_NGROK } from "@dub/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // get code and workspace id from query params
  const code = searchParams.get("code") as string;
  const state = searchParams.get("state") as string;

  if (!state) {
    console.warn("No state found in OAuth callback");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  let redirectUrl = getRedirectUrl("onboarding");

  let stateObject: any = {};

  try {
    stateObject = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
  } catch (e) {
    console.warn("Failed to parse state in OAuth callback");
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }

  const { provider, partnerId, source } = stateObject;

  redirectUrl = getRedirectUrl(source);

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

    const {
      tokenUrl,
      clientId,
      clientSecret,
      verify,
      verifiedColumn,
      pkce,
      clientIdParam,
    } = ONLINE_PRESENCE_PROVIDERS[provider];

    // Get code verifier from cookie if this is X/Twitter
    const codeVerifier = pkce
      ? cookies().get("online_presence_code_verifier")?.value
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
    });

    const isVerified = await verify({
      partner,
      accessToken: result.access_token,
    });

    if (isVerified) {
      await prisma.partner.update({
        where: {
          id: partnerId,
        },
        data: {
          [provider]: partner[provider],
          [verifiedColumn]: new Date(),
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
    : `${PARTNERS_DOMAIN}/settings#online-presence`;
