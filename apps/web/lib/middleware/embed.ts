import { NextRequest, NextResponse } from "next/server";
import { EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "../embed/constants";
import { embedToken } from "../embed/embed-token";
import { parse } from "./utils";

export default async function EmbedMiddleware(req: NextRequest, response: NextResponse) {
  const { fullPath } = parse(req);

  const token = req.nextUrl.searchParams.get("token");

  if (token) {
    const linkId = await embedToken.get(token);

    if (linkId) {
      const finalResponse = NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url), {
        request: req
      });
      
      finalResponse.cookies.set(EMBED_PUBLIC_TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        path: '/',
      });
      
      return finalResponse;
    }
  }

  return NextResponse.redirect(new URL("/", req.url));
}
