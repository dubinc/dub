import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { extractPublishableKey, ratelimitOrThrow } from "@/lib/api/utils";
import { getWorkspaceByPublishableKey } from "@/lib/planetscale";
import { QRCodeSVG } from "@/lib/qr/utils";
import { getQRCodeQuerySchema } from "@/lib/zod/schemas/qr";
import { getSearchParams } from "@dub/utils";
import { DUB_QR_LOGO } from "@dub/utils/src/constants";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const params = getSearchParams(req.url);

    const { url, logo, size, level, fgColor, bgColor, includeMargin } =
      getQRCodeQuerySchema.parse(params);

    if (logo !== DUB_QR_LOGO) {
      const publishableKey = extractPublishableKey(req);
      await ratelimitOrThrow(req, "qr"); // rate limit in case of DDoS
      const workspace = await getWorkspaceByPublishableKey(publishableKey);

      if (!workspace || workspace.plan === "free") {
        throw new DubApiError({
          code: "unauthorized",
          message:
            "You can only use a logo with a paid plan and by authenticating via a publishable key. Learn more: https://d.to/pk",
        });
      }
    }

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
