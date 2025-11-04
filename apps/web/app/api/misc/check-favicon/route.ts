import { withSession } from "@/lib/auth";
import { GOOGLE_FAVICON_URL } from "@dub/utils";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ searchParams }) => {
  const { domain } = searchParams;

  if (!domain) {
    return NextResponse.json(
      { error: "Domain parameter is required" },
      { status: 400 },
    );
  }

  try {
    const faviconUrl = `${GOOGLE_FAVICON_URL}${domain}`;

    const response = await fetch(faviconUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Dub/1.0)",
      },
    });

    return NextResponse.json({
      exists: response.ok,
      status: response.status,
      url: faviconUrl,
    });
  } catch (error) {
    console.error("Error checking favicon:", error);
    return NextResponse.json(
      {
        exists: false,
        error: "Failed to check favicon",
      },
      { status: 500 },
    );
  }
});
