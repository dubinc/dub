import { parse } from "@/lib/middleware/utils";
import { NextRequest, NextResponse } from "next/server";
import NewLinkMiddleware from "./new-link";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getOnboardingStep } from "./utils/get-onboarding-step";
import { getUserViaToken } from "./utils/get-user-via-token";
import WorkspacesMiddleware from "./workspaces";

export default async function AppMiddleware(req: NextRequest) {
  const { path, fullPath } = parse(req);
  const user = await getUserViaToken(req);
  const isWorkspaceInvite = req.nextUrl.searchParams.get("invite");

  // if there's no user and the path isn't /login or /register, redirect to /login
  if (
    !user &&
    path !== "/login" &&
    path !== "/register" &&
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

      /* Onboarding redirects

        - User was created less than a day ago
        - User is not invited to a workspace (redirect straight to the workspace)
        - The path does not start with /onboarding
        - The user has not completed the onboarding step
      */
    } else if (
      new Date(user.createdAt).getTime() > Date.now() - 60 * 60 * 24 * 1000 &&
      !isWorkspaceInvite &&
      !path.startsWith("/onboarding") &&
      (await getOnboardingStep(user)) !== "completed"
    ) {
      let step = await getOnboardingStep(user);
      if (!step) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      } else if (step === "completed") {
        return WorkspacesMiddleware(req, user);
      }

      const defaultWorkspace = await getDefaultWorkspace(user);

      if (defaultWorkspace) {
        // Skip workspace step if user already has a workspace
        step = step === "workspace" ? "link" : step;
        return NextResponse.redirect(
          new URL(`/onboarding/${step}?workspace=${defaultWorkspace}`, req.url),
        );
      } else {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }

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
        "/upgrade",
      ].includes(path) ||
      path.startsWith("/integrations/") ||
      path.startsWith("/settings/")
    ) {
      return WorkspacesMiddleware(req, user);
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
}
