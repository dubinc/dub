import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, PARTNERS_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // get code and workspace id from query params
  const code = searchParams.get("code") as string;
  const state = searchParams.get("state") as string;
  if (!code || !state) {
    //return NextResponse.redirect(APP_DOMAIN);
    return NextResponse.json({ message: "error" });
  }

  try {
    const stateJSON = JSON.parse(state);
    let { partnerId, source } = stateJSON;

    // Get access token
    const result = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `client_id=${process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID}&client_secret=${process.env.YOUTUBE_CLIENT_SECRET}&code=${code}&redirect_uri=${APP_DOMAIN_WITH_NGROK}/api/partners/online-presence/callback&grant_type=authorization_code`,
    }).then((r) => r.json());

    if (!result || !result.access_token) {
      return NextResponse.redirect(PARTNERS_DOMAIN);
    }

    // Fetch channel info
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&access_token=${result.access_token}`,
    ).then((r) => r.json());

    const handle = channelResponse?.items?.[0]?.snippet?.customUrl;

    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        youtube: true,
      },
    });

    if (
      partner &&
      handle &&
      `@${partner?.youtube?.toLowerCase()}` === handle.toLowerCase()
    ) {
      await prisma.partner.update({
        where: {
          id: partnerId,
        },
        data: {
          youtube: partner.youtube,
          youtubeVerifiedAt: new Date(),
        },
      });
    }

    return NextResponse.redirect(
      source === "onboarding"
        ? `${PARTNERS_DOMAIN}/onboarding/online-presence`
        : `${PARTNERS_DOMAIN}/settings#online-presence`,
    );
  } catch (error) {
    return NextResponse.redirect(PARTNERS_DOMAIN);
  }
}
