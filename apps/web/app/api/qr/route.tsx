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
      // Free workspaces should always use the default logo.
      if (!workspace || workspace.plan === "free") {
        logo = DUB_QR_LOGO;
        /*
          If:
          - no logo is passed
          - the workspace has a logo
          - the hideLogo flag is not set
          then we should use the workspace logo.
        */
      } else if (!logo && workspace.logo && !hideLogo) {
        logo = workspace.logo;
      }
      // if the link is not on Dub, use the default logo.
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
