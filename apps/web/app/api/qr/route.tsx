import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getIdentityHash } from "@/lib/edge";
import { QRCodeSVG } from "@/lib/qr/utils";
import { ratelimit } from "@/lib/upstash";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { getSearchParams } from "@dub/utils";
import { getToken } from "next-auth/jwt";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    // Rate limit if user is not logged in
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session?.email) {
      const identity_hash = await getIdentityHash(req);
      const { success } = await ratelimit().limit(`qr:${identity_hash}`);
      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message: "Don't DDoS me pls 🥺",
        });
      }
    }

    const params = getSearchParams(req.url);
    const { url, size, level, fgColor, bgColor, includeMargin } =
      getQRCodeQuerySchema.parse(params);

    // const logo = req.nextUrl.searchParams.get("logo") || "https://assets.dub.co/logo.png";

    return new ImageResponse(
      QRCodeSVG({
        value: url,
        size,
        level,
        includeMargin,
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
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
