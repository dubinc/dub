import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { QRCodeSVG } from "@/lib/qr/utils";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { getSearchParams } from "@dub/utils";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    await ratelimitOrThrow(req, "qr");

    const params = getSearchParams(req.url);
    const { url, logo, size, level, fgColor, bgColor, includeMargin } =
      getQRCodeQuerySchema.parse(params);

    return new ImageResponse(
      QRCodeSVG({
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
        isOGContext: true,
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
