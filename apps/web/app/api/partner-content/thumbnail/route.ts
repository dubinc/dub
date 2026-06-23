import { isInstagramCdnUrl } from "@/lib/partner-content-search/thumbnail-url";
import { fetchWithTimeout } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

const THUMBNAIL_FETCH_TIMEOUT_MS = 5000;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !isInstagramCdnUrl(url)) {
    return new NextResponse("Invalid thumbnail URL", { status: 400 });
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (compatible; DubPartnerContentPreview/1.0; +https://dub.co)",
        },
        // Block redirect-based SSRF off the allowlisted host.
        redirect: "error",
      },
      THUMBNAIL_FETCH_TIMEOUT_MS,
    );
  } catch {
    return new NextResponse("Failed to fetch thumbnail", { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !response.body || !contentType.startsWith("image/")) {
    return new NextResponse("Failed to fetch thumbnail", { status: 502 });
  }

  const headers = new Headers({
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "Content-Type": contentType,
  });
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(response.body, { headers });
}
