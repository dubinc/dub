import { NextRequest, NextResponse } from "next/server";
import { EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "../embed/constants";
import { embedToken } from "../embed/embed-token";
import { parse } from "./utils";

export default async function EmbedMiddleware(req: NextRequest) {
  const { fullPath } = parse(req);

  const token = req.nextUrl.searchParams.get("token");

  if (token) {
    const linkId = await embedToken.get(token);

    if (linkId) {
      return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url), {
        headers: {
          "Set-Cookie": `${EMBED_PUBLIC_TOKEN_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=None; Path=/`,
        },
      });
    }
  }

  return NextResponse.redirect(new URL("/", req.url));
}
