import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { parse } from "#/lib/middleware/utils";
import { UserProps } from "../types";

export default async function AppMiddleware(req: NextRequest) {
  const { path } = parse(req);
  const session = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as {
    email?: string;
    user?: UserProps;
  };
  // if there's no session and the path isn't /login or /register, redirect to /login
  if (!session?.email && path !== "/login" && path !== "/register") {
    return NextResponse.redirect(
      new URL(
        `/login${path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`,
        req.url,
      ),
    );

    // if there's a session
  } else if (session?.email) {
    // if the user was created in the last 10 seconds, redirect to "/welcome"
    // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
    if (
      session?.user?.createdAt &&
      new Date(session?.user?.createdAt).getTime() > Date.now() - 10000 &&
      path !== "/welcome"
    ) {
      return NextResponse.redirect(new URL("/welcome", req.url));

      // if the path is /login or /register, redirect to "/"
    } else if (path === "/login" || path === "/register") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app${path}`, req.url));
}
