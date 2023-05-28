import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { parse } from "@/lib/middleware/utils";
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
    return NextResponse.redirect(new URL("/login", req.url));

    // if there's a session and the path is /login or /register, redirect to /
  } else if (session?.email && (path === "/login" || path === "/register")) {
    // only redirect if the user was created in the last 10 seconds
    // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
    if (
      session?.user?.createdAt &&
      new Date(session?.user?.createdAt).getTime() > Date.now() - 10000
    ) {
      return NextResponse.redirect(new URL("/welcome", req.url));
    } else {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app${path}`, req.url));
}
