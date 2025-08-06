import { parse } from "@/lib/middleware/utils";
import { UserProps } from "@/lib/types.ts";
import { userSessionIdInit } from "core/services/cookie/user-session-id-init.service.ts";
import { NextRequest, NextResponse } from "next/server";
// import EmbedMiddleware from "./embed";
import { isTopLevelSettingsRedirect } from "@/lib/middleware/utils/is-top-level-settings-redirect.ts";
import WorkspacesMiddleware from "@/lib/middleware/workspaces.ts";
import { appRedirect } from "./utils/app-redirect";

export default async function AppMiddleware(
  req: NextRequest,
  user?: UserProps,
  isPublicRoute?: boolean,
) {
  const { domain, path, fullPath } = parse(req);

  // if (path.startsWith("/embed")) {
  //   return EmbedMiddleware(req);
  // }
  const isWorkspaceInvite =
    req.nextUrl.searchParams.get("invite") || path.startsWith("/invites/");

  // Initialize session ID for authenticated users
  let sessionInit: ReturnType<typeof userSessionIdInit> | null = null;
  if (user) {
    sessionInit = userSessionIdInit(req, user.id);
  }

  // if there's no user and the path isn't /login or /register, redirect to /login
  if (
    !user
    // path !== "/login" &&
    // path !== "/forgot-password" &&
    // path !== "/register" &&
    // path !== "/auth/saml" &&
    // !path.startsWith("/auth/reset-password/") &&
    // !path.startsWith("/share/")
  ) {
    const response = NextResponse.rewrite(
      new URL(
        `/${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        req.url,
      ),
    );

    // Set session cookie if needed
    if (sessionInit?.needsUpdate) {
      response.cookies.set(sessionInit.cookieName, sessionInit.sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }

    return response;

    // if there's a user
  } else if (user) {
    // /new is a special path that creates a new link (or workspace if the user doesn't have one yet)
    // if (path === "/new") {
    //   return NewLinkMiddleware(req, user);

    //   /* Onboarding redirects

    //     - User was created less than a day ago
    //     - User is not invited to a workspace (redirect straight to the workspace)
    //     - The path does not start with /onboarding
    //     - The user has not completed the onboarding step
    //   */
    // } else if (
    // if (
    //   new Date(user.createdAt).getTime() > Date.now() - 60 * 60 * 24 * 1000 &&
    //   !isWorkspaceInvite &&
    //   !["/onboarding", "/account"].some((p) => path.startsWith(p)) &&
    //   !(await getDefaultWorkspace(user)) &&
    //   (await getOnboardingStep(user)) !== "completed"
    // ) {
    //   let step = await getOnboardingStep(user);
    //   if (!step) {
    //     return NextResponse.redirect(new URL("/onboarding", req.url));
    //   } else if (step === "completed") {
    //     return WorkspacesMiddleware(req, user);
    //   }
    //
    //   const defaultWorkspace = await getDefaultWorkspace(user);
    //
    //   if (defaultWorkspace) {
    //     // Skip workspace step if user already has a workspace
    //     step = step === "workspace" ? "link" : step;
    //     return NextResponse.redirect(
    //       new URL(`/onboarding/${step}?workspace=${defaultWorkspace}`, req.url),
    //     );
    //   } else {
    //     return NextResponse.redirect(new URL("/onboarding", req.url));
    //   }
    //
    //   // if the path is / or /login or /register, redirect to the default workspace
    // } else
    if (
      [
        "/",
        "/login",
        "/register",
        "/workspaces",
        "/analytics",
        "/events",
        "/programs",
        "/settings",
        "/upgrade",
        "/wrapped",
      ].includes(path) ||
      path.startsWith("/settings/") ||
      isTopLevelSettingsRedirect(path)
    ) {
      return WorkspacesMiddleware(req, user);
    } else if (isPublicRoute) {
      return NextResponse.rewrite(new URL(`/${domain}${path}`, req.url));
    } else if (appRedirect(path)) {
      return NextResponse.redirect(new URL(appRedirect(path), req.url));
    }
  }

  // otherwise, rewrite the path to /app
  const response = NextResponse.rewrite(
    new URL(`/app.dub.co${fullPath}`, req.url),
  );

  // Set session cookie if needed
  if (sessionInit?.needsUpdate) {
    response.cookies.set(sessionInit.cookieName, sessionInit.sessionId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }

  return response;
}
