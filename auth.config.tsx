import type { NextAuthConfig } from "@auth/nextjs";
import GoogleProvider from "@auth/nextjs/providers/google";
import { NextResponse } from "next/server";
import { parse } from "@/lib/middleware/utils";
import { APP_HOSTNAMES } from "@/lib/constants";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL;

declare module "@auth/nextjs/types" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
    };
  }
}

export default {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain: VERCEL_DEPLOYMENT ? ".dub.sh" : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  callbacks: {
    session({ session, token }) {
      return { ...session, user: { ...session.user, id: token.sub } };
    },
    authorized({ request: req, auth }) {
      const { domain, path } = parse(req);

      // for App (e.g. app.dub.sh)
      if (!APP_HOSTNAMES.has(domain)) return;

      const session = auth.user;

      // if there's no session and the path isn't /login or /register, redirect to /login
      if (!session && path !== "/login" && path !== "/register") {
        return NextResponse.redirect(
          new URL(
            `/login${path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`,
            req.url,
          ),
        );

        // if there's a session
      } else if (session) {
        // if the user was created in the last 10 seconds, redirect to "/welcome"
        // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
        if (
          session.createdAt.valueOf() > Date.now() - 10000 &&
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
    },
  },
} satisfies NextAuthConfig;
