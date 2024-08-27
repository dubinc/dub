import { punyEncode } from "@dub/utils";
import { NextResponse } from "next/server";

export function createResponseWithCookie(
  response: NextResponse,
  { clickId, path }: { clickId: string; path: string },
): NextResponse {
  response.cookies.set("dclid", clickId, {
    path: punyEncode(path), // encode the key to handle non-ASCII characters
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
