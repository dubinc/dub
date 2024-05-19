import { parse } from "@/lib/middleware/utils";
import { APP_DOMAIN } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getUserViaToken } from "./utils/get-user-via-token";

export default async function AppMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);
  const user = await getUserViaToken(req);

  // if there's no user and the path isn't /login or /register, redirect to /login
  if (
    !user &&
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

    // if there's a user
  } else if (user) {
    // /new is a special path that creates a new link (or workspace if the user doesn't have one yet)
    if (path === "/new") {
      const defaultWorkspace = await getDefaultWorkspace(user);

      const searchParams = new URL(fullPath, APP_DOMAIN).searchParams;

      if (defaultWorkspace) {
        return NextResponse.redirect(
          new URL(
            `/${defaultWorkspace}?newLink=${searchParams.get("link") || true}${searchParams.has("domain") ? `&newLinkDomain=${searchParams.get("domain")}` : ""}`,
            req.url,
          ),
        );
      } else {
        return NextResponse.redirect(new URL(`/?newWorkspace=true`, req.url));
      }

      // if the user was created in the last 10s
      // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
    } else if (
      user.createdAt &&
      new Date(user.createdAt).getTime() > Date.now() - 10000 &&
      // here we include the root page + /new (since they're going through welcome flow already)
      path === "/"
    ) {
      return NextResponse.redirect(new URL("/welcome", req.url));

      // if the path is /login or /register, redirect to "/"
    } else if (path === "/login" || path === "/register") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(
    new URL(`/app.dub.co${fullPath === "/" ? "" : fullPath}`, req.url),
  );
}
