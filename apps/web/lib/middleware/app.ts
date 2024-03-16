import { auth } from "@/lib/auth";
import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";

export default async function AppMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);
  const session = await auth();
  // if there's no session and the path isn't /login or /register, redirect to /login
  if (
    !session?.user &&
    path !== "/login" &&
    path !== "/register" &&
    path !== "/auth/saml"
  ) {
    return NextResponse.redirect(
      new URL(
        `/login${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        req.url,
      ),
    );

    // else if there's a session, redirect to / of app
  } else if ((session?.user && path === "/login") || path === "/register") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(
    new URL(`/app.dub.co${fullPath === "/" ? "" : fullPath}`, req.url),
  );
}
