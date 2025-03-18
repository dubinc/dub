import { NextResponse } from "next/server";

export function createResponseWithCookies(
  response: NextResponse,
  {
    path,
    clickId,
    testUrl,
  }: { path: string; clickId?: string; testUrl?: string | null },
): NextResponse {
  if (clickId !== undefined) {
    response.cookies.set("dub_id", clickId, {
      path,
      maxAge: 60 * 60, // 1 hour
    });
  }

  if (testUrl) {
    response.cookies.set("dub_test_url", testUrl, {
      path,
      maxAge: 60 * 60, // 1 hour
    });
  }

  return response;
}
