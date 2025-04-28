import { NextResponse } from "next/server";

export function createResponseWithCookies(
  response: NextResponse,
  {
    path,
    dubIdCookieName,
    dubIdCookieValue,
    dubTestUrlValue,
  }: {
    path: string;
    dubIdCookieName: string;
    dubIdCookieValue: string;
    dubTestUrlValue?: string | null;
  },
): NextResponse {
  // set dub_id_<domain>_<key> cookie
  // this caches dub_id for 1 hour (for deduplication)
  response.cookies.set(dubIdCookieName, dubIdCookieValue, {
    path,
    maxAge: 60 * 60, // 1 hour
  });

  // set dub_test_url if this link has testVariants
  // caches for 1 week (for consistent user experience)
  if (dubTestUrlValue) {
    response.cookies.set("dub_test_url", dubTestUrlValue, {
      path,
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  }

  return response;
}
