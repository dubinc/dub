import { getIdentityHash } from "@/lib/edge";
import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_INCLUDEMARGIN,
  DEFAULT_LEVEL,
  QR_LEVELS,
} from "@/lib/qr/constants";
import { QRCodeSVG } from "@/lib/qr/utils";
import { ratelimit } from "@/lib/upstash";
import { getToken } from "next-auth/jwt";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  // Rate limit if user is not logged in
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session?.email) {
    const identity_hash = await getIdentityHash(req);
    const { success } = await ratelimit().limit(`qr:${identity_hash}`);
    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
  }

  const url = req.nextUrl.searchParams.get("url") || "https://dub.co";
  const size = parseInt(req.nextUrl.searchParams.get("size") || "600", 10);
  const level = req.nextUrl.searchParams.get("level") || DEFAULT_LEVEL;
  if (!QR_LEVELS.includes(level)) {
    return new Response("Invalid QR code level.", { status: 400 });
  }
  const fgColor = req.nextUrl.searchParams.get("fgColor") || DEFAULT_FGCOLOR;
  const bgColor = req.nextUrl.searchParams.get("bgColor") || DEFAULT_BGCOLOR;

  const includeMargin =
    req.nextUrl.searchParams.get("includeMargin") || DEFAULT_INCLUDEMARGIN;

  // const logo = req.nextUrl.searchParams.get("logo") || "https://assets.dub.co/logo.png";

  return new ImageResponse(
    QRCodeSVG({
      value: url,
      size,
      level,
      includeMargin: includeMargin === "true",
      fgColor,
      bgColor,
      // imageSettings: {
      //   src: logo,
      //   height: size / 4,
      //   width: size / 4,
      //   excavate: true,
      // },
    }),
    {
      width: size,
      height: size,
    },
  );
}
