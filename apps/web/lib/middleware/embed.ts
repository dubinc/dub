import { NextRequest, NextResponse } from "next/server";
import { REFERRALS_EMBED_PUBLIC_TOKEN_COOKIE_NAME } from "../embed/constants";
import { referralsEmbedToken } from "../embed/referrals/token-class";
import { parse } from "./utils";

export default async function EmbedMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);

  const token = req.nextUrl.searchParams.get("token");

  const embedTokenClass = path.endsWith("/referrals")
    ? referralsEmbedToken
    : null; // future: add class for analytics embed token

  if (token && embedTokenClass) {
    const tokenData = await embedTokenClass.get(token);

    if (tokenData) {
      return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url), {
        headers: {
          "Set-Cookie": `${REFERRALS_EMBED_PUBLIC_TOKEN_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=None; Path=/`,
        },
      });
    }
  }

  return NextResponse.redirect(new URL("/", req.url));
}
