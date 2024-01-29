import { NextRequest } from "next/server";
import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP } from "@dub/utils";
import { ipAddress } from "@vercel/edge";
import { getToken } from "next-auth/jwt";
import { ImageResponse } from "next/og";
import { QRCodeSVG } from "@/lib/qr/utils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  // Rate limit if user is not logged in
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!session?.email) {
    const ip = ipAddress(req) || LOCALHOST_IP;
    const { success } = await ratelimit().limit(ip);
    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
  }

  const url = req.nextUrl.searchParams.get("url") || "https://dub.co";
  const size = parseInt(req.nextUrl.searchParams.get("size") || "600", 10);
  // const logo = req.nextUrl.searchParams.get("logo") || "https://d2vwwcvoksz7ty.cloudfront.net/logo.png";

  return new ImageResponse(
    QRCodeSVG({
      value: url,
      size: size,
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
