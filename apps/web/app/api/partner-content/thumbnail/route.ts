import { isInstagramCdnUrl } from "@/lib/partner-content-search/thumbnail-url";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !isInstagramCdnUrl(url)) {
    return new NextResponse("Invalid thumbnail URL", { status: 400 });
  }

  const response = await fetch(url, {
    headers: {
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (compatible; DubPartnerContentPreview/1.0; +https://dub.co)",
    },
    redirect: "error",
  });

  if (!response.ok || !response.body) {
    return new NextResponse("Failed to fetch thumbnail", { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    return new NextResponse("Invalid thumbnail content type", { status: 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": contentType,
    },
  });
}
