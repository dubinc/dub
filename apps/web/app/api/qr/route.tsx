import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getShortLinkViaEdge } from "@/lib/planetscale";
import { getDomainViaEdge } from "@/lib/planetscale/get-domain-via-edge";
import { QRCodeSVG } from "@/lib/qr/utils";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { DUB_QR_LOGO, getSearchParams } from "@dub/utils";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function GET(req: NextRequest) {
  try {
    await ratelimitOrThrow(req, "qr");

    const paramsParsed = getQRCodeQuerySchema.parse(getSearchParams(req.url));

    const { url, size, level, fgColor, bgColor, margin, hideLogo } =
      paramsParsed;

    let { logo } = paramsParsed;

    const shortLink = await getShortLinkViaEdge(url.split("?")[0]);

    // it is a Dub link.
    if (shortLink) {
      const domain = await getDomainViaEdge(shortLink.domain);

      /*
          If:
          - no logo is passed
          - the domain has a logo
          - the hideLogo flag is not set
          then we should use the domain logo.
      */
      if (!logo && domain?.logo && !hideLogo) {
        logo = domain.logo;
      } else if (!domain?.logo) {
        logo = DUB_QR_LOGO;
      }
    } else {
      logo = DUB_QR_LOGO;
    }

    return new ImageResponse(
      QRCodeSVG({
        value: url,
        size,
        level,
        fgColor,
        bgColor,
        margin,
        ...(logo
          ? {
              imageSettings: {
                src: logo,
                height: size / 4,
                width: size / 4,
                excavate: true,
              },
            }
          : {}),
        isOGContext: true,
      }),
      {
        width: size,
        height: size,
        headers: CORS_HEADERS,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
