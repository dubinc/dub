import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getQRAsSVG } from "@/lib/qr/api";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { getSearchParams } from "@dub/utils";
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    await ratelimitOrThrow(req, "qr");

    const params = getSearchParams(req.url);
    const { url, size, level, fgColor, bgColor, includeMargin } =
      getQRCodeQuerySchema.parse(params);

    const logo =
      req.nextUrl.searchParams.get("logo") || "https://assets.dub.co/logo.png";

    const svg = await getQRAsSVG({
      value: url,
      size,
      level,
      includeMargin,
      fgColor,
      bgColor,
      imageSettings: {
        src: logo,
        height: size / 4,
        width: size / 4,
        excavate: true,
      },
    });

    return new ImageResponse(svg, {
      width: size,
      height: size,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
