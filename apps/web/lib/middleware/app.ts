import { NextRequest, NextResponse } from "next/server";
import {
  ONBOARDING_WINDOW_SECONDS,
  onboardingStepCache,
} from "../api/workspaces/onboarding-step-cache";
import { EmbedMiddleware } from "./embed";
import { NewLinkMiddleware } from "./new-link";
import { appRedirect } from "./utils/app-redirect";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getUserViaToken } from "./utils/get-user-via-token";
import { isTopLevelSettingsRedirect } from "./utils/is-top-level-settings-redirect";
import { parse } from "./utils/parse";
import { WorkspacesMiddleware } from "./workspaces";

export async function AppMiddleware(req: NextRequest) {
  const { path, fullPath, searchParamsString } = parse(req);

  if (path.startsWith("/embed")) {
    return EmbedMiddleware(req);
  }

  const user = await getUserViaToken(req);
  const isWorkspaceInvite =
    req.nextUrl.searchParams.get("invite") || path.startsWith("/invites/");

  // if there's no user and the path isn't /login or /register, redirect to /login
  if (
    !user &&
    path !== "/login" &&
    path !== "/forgot-password" &&
    path !== "/register" &&
    path !== "/auth/saml" &&
    !path.startsWith("/auth/reset-password/") &&
    !path.startsWith("/share/") &&
    !path.startsWith("/deeplink/")
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
        - User doesn't have a default workspace
        - User has not completed the onboarding flow
      */
    } else if (
      new Date(user.createdAt).getTime() >
        Date.now() - ONBOARDING_WINDOW_SECONDS * 1000 &&
      !isWorkspaceInvite &&
      !["/onboarding", "/account"].some((p) => path.startsWith(p)) &&
      !(await getDefaultWorkspace(user)) &&
      (await onboardingStepCache.get({ userId: user.id })) !== "completed"
    ) {
      let step = await onboardingStepCache.get({ userId: user.id });
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
        "/workspaces",
        "/links",
        "/analytics",
        "/events",
        "/customers",
        "/program",
        "/programs",
        "/settings",
        "/upgrade",
        "/guides",
        "/wrapped",
      ].includes(path) ||
      path.startsWith("/program/") ||
      path.startsWith("/settings/") ||
      isTopLevelSettingsRedirect(path)
    ) {
      return WorkspacesMiddleware(req, user);
    }

    const appRedirectPath = await appRedirect(path);
    if (appRedirectPath) {
      return NextResponse.redirect(
        new URL(`${appRedirectPath}${searchParamsString}`, req.url),
      );
    }

    // if (path.startsWith("/onboarding/welcome")) {
    //   // Redirect users with pending workspace invites away from onboarding
    //   // to accept their invitation instead of creating a new workspace
    //   const pendingInvite = await prismaEdge.projectInvite.findFirst({
    //     where: {
    //       email: user.email,
    //     },
    //     select: {
    //       project: {
    //         select: {
    //           slug: true,
    //         },
    //       },
    //     },
    //   });

    //   if (pendingInvite) {
    //     return NextResponse.redirect(
    //       new URL(`/${pendingInvite.project.slug}?invite=1`, req.url),
    //     );
    //   }

    //   // If user already has a workspace, redirect them away from onboarding
    //   // to their workspaces page instead of allowing them to create a new one
    //   const existingWorkspace = await prismaEdge.project.findFirst({
    //     where: {
    //       users: {
    //         some: {
    //           userId: user.id,
    //         },
    //       },
    //     },
    //   });

    //   if (existingWorkspace) {
    //     return NextResponse.redirect(new URL("/workspaces", req.url));
    //   }
    // }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app.dub.co${fullPath}`, req.url));
}
