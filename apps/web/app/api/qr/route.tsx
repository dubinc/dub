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
    const paramsParsed = getQRCodeQuerySchema.parse(getSearchParams(req.url));

    await ratelimitOrThrow(req, "qr");

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

  const workspace = await getWorkspaceViaEdge(shortLink.projectId);

  if (workspace?.plan === "free") {
    return DUB_QR_LOGO;
  }

  // if hideLogo is set, return null
  if (hideLogo) {
    return null;
  }

  // if logo is passed, return it
  if (logo) {
    return logo;
  }

  // if it's a Dub owned domain and no  workspace logo is set, use the Dub logo
  if (isDubDomain(shortLink.domain) && !workspace?.logo) {
    return DUB_QR_LOGO;
  }

  // if it's a custom domain, check if it has a logo
  const domain = await getDomainViaEdge(shortLink.domain);

  // return domain logo if it has one, otherwise fallback to workspace logo, and finally fallback to Dub logo
  return domain?.logo || workspace?.logo || DUB_QR_LOGO;
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
