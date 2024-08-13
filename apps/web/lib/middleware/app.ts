import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";
import NewLinkMiddleware from "./new-link";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getUserViaToken } from "./utils/get-user-via-token";

export default async function AppMiddleware(req: NextRequest) {
  const { path, fullPath, searchParamsString } = parse(req);
  const user = await getUserViaToken(req);
  const isWorkspaceInvite = req.nextUrl.searchParams.get("invite");

  // if there's no user and the path isn't /login or /register, redirect to /login
  if (
    !user &&
    path !== "/login" &&
    path !== "/forgot-password" &&
    path !== "/register" &&
    path !== "/register/verify-email" &&
    path !== "/auth/saml" &&
    !path.startsWith("/auth/reset-password/")
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
      return NewLinkMiddleware(req, user);

      // if the user was created in the last 10s
      // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
    } else if (
      user.createdAt &&
      new Date(user.createdAt).getTime() > Date.now() - 10000 &&
      // here we include the root page + /new (since they're going through welcome flow already)
      path !== "/welcome" &&
      // if the user was invited to a workspace, don't show the welcome page – redirect straight to the workspace
      !isWorkspaceInvite
    ) {
      return NextResponse.redirect(new URL("/welcome", req.url));

      // if the path is / or /login or /register, redirect to the default workspace
    } else if (
      [
        "/",
        "/login",
        "/register",
        "/analytics",
        "/events",
        "/integrations",
        "/domains",
        "/settings",
      ].includes(path) ||
      path.startsWith("/integrations/") ||
      path.startsWith("/settings/")
    ) {
      const defaultWorkspace = await getDefaultWorkspace(user);

      if (defaultWorkspace) {
        let redirectPath = path;
        if (["/", "/login", "/register"].includes(path)) {
          redirectPath = "";
        } else if (
          path === "/integrations" ||
          path.startsWith("/integrations/")
        ) {
          redirectPath = `/settings/${path}`;
        }
        return NextResponse.redirect(
          new URL(
            `/${defaultWorkspace}${redirectPath}${searchParamsString}`,
            req.url,
          ),
        );
      } else {
        return NextResponse.redirect(new URL("/workspaces", req.url));
      }
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
}
