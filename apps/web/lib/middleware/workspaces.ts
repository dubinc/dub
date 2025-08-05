import { UserProps } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { isValidInternalRedirect, parse } from "./utils";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getDubProductFromCookie } from "./utils/get-dub-product-from-cookie";
import { isTopLevelSettingsRedirect } from "./utils/is-top-level-settings-redirect";

/**
 * Middleware to handle workspace-specific routing and prevent redirect loops
 * @param req - The incoming request
 * @param user - The authenticated user
 * @returns NextResponse with appropriate redirect or next() to continue
 */
export default async function WorkspacesMiddleware(
  req: NextRequest,
  user: UserProps,
): Promise<NextResponse> {
  const { path, searchParamsObj, searchParamsString } = parse(req);

  // Handle ?next= query param with proper validation to prevent open redirects
  if (
    searchParamsObj.next &&
    isValidInternalRedirect(searchParamsObj.next, req.url)
  ) {
    return NextResponse.redirect(new URL(searchParamsObj.next, req.url));
  }

  const defaultWorkspace = await getDefaultWorkspace(user);

  if (defaultWorkspace) {
    // Check if the user is already on a URL that contains their workspace slug
    // This prevents redirect loops when users are already on the correct workspace URL
    const pathSegments = path.split("/").filter(Boolean);
    const isAlreadyOnWorkspace = pathSegments.length > 0 && pathSegments[0] === defaultWorkspace;
    
    if (isAlreadyOnWorkspace) {
      // User is already on the correct workspace, no need to redirect
      return NextResponse.next();
    }

    let redirectPath = path;
    if (["/", "/login", "/register", "/workspaces"].includes(path)) {
      redirectPath = "";
    } else if (isTopLevelSettingsRedirect(path)) {
      redirectPath = `/settings/${path}`;
    }

    if (!redirectPath) {
      // Determine product from cookie (default to links)
      const product = getDubProductFromCookie(defaultWorkspace);
      redirectPath = `/${product}`;
    }

    const finalRedirectUrl = new URL(
      `/${defaultWorkspace}${redirectPath}${searchParamsString}`,
      req.url,
    );

    // Additional safety check: ensure we're not redirecting to the same URL
    if (finalRedirectUrl.pathname === req.nextUrl.pathname) {
      console.warn(`Potential redirect loop detected: ${req.url} -> ${finalRedirectUrl.toString()}`);
      return NextResponse.next();
    }

    return NextResponse.redirect(finalRedirectUrl);
  } else {
    return NextResponse.redirect(new URL("/onboarding/workspace", req.url));
  }
}
