import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getShortLinkViaEdge, getWorkspaceViaEdge } from "@/lib/planetscale";
import { QRCodeSVG } from "@/lib/qr/utils";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { DUB_QR_LOGO, getSearchParams } from "@dub/utils";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const params = getSearchParams(req.url);

    let { url, logo, size, level, fgColor, bgColor, hideLogo, includeMargin } =
      getQRCodeQuerySchema.parse(params);

    await ratelimitOrThrow(req, "qr");

    const shortLink = await getShortLinkViaEdge(url.split("?")[0]);
    if (shortLink) {
      const workspace = await getWorkspaceViaEdge(shortLink.projectId);
      if (!workspace || workspace.plan === "free") {
        logo = DUB_QR_LOGO;
      } else if (workspace.logo && !hideLogo) {
        logo = workspace.logo;
      }
    } else {
      logo = DUB_QR_LOGO;
    }

    return new ImageResponse(
      QRCodeSVG({
        value: url,
        size,
        level,
        includeMargin,
        fgColor,
        bgColor,
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
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
