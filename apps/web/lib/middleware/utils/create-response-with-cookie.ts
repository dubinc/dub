import { NextResponse } from "next/server";

export function createResponseWithCookie(
  response: NextResponse,
  {
    clickId,
    path,
    skipTracking,
  }: {
    clickId: string;
    path: string;
    skipTracking?: boolean;
  },
): NextResponse {
  if (!skipTracking) {
    response.cookies.set("dub_id", clickId, {
      path,
      maxAge: 60 * 60, // 1 hour
    });
  }

  return response;
}
