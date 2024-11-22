import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getShortLinkViaEdge, getWorkspaceViaEdge } from "@/lib/planetscale";
import { getDomainViaEdge } from "@/lib/planetscale/get-domain-via-edge";
import { QRCodeSVG } from "@/lib/qr/utils";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { DUB_QR_LOGO, getSearchParams, isDubDomain } from "@dub/utils";
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

    const { logo, url, size, level, fgColor, bgColor, margin, hideLogo } =
      paramsParsed;

    const qrCodeLogo = await getQRCodeLogo({ url, logo, hideLogo });

    return new ImageResponse(
      QRCodeSVG({
        value: url,
        size,
        level,
        fgColor,
        bgColor,
        margin,
        ...(qrCodeLogo
          ? {
              imageSettings: {
                src: qrCodeLogo,
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

const getQRCodeLogo = async ({
  url,
  logo,
  hideLogo,
}: {
  url: string;
  logo: string | undefined;
  hideLogo: boolean;
}) => {
  const shortLink = await getShortLinkViaEdge(url.split("?")[0]);

  // Not a Dub link
  if (!shortLink) {
    return DUB_QR_LOGO;
  }

  // Dub owned domain
  if (isDubDomain(shortLink.domain)) {
    return DUB_QR_LOGO;
  }

  // hideLogo is set or logo is passed
  if (hideLogo || logo) {
    const workspace = await getWorkspaceViaEdge(shortLink.projectId);

    if (workspace?.plan === "free") {
      return DUB_QR_LOGO;
    }

    if (hideLogo) {
      return null;
    }

    return logo;
  }

  // if no logo is passed, use domain logo
  const domain = await getDomainViaEdge(shortLink.domain);

  return domain?.logo || DUB_QR_LOGO;
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
