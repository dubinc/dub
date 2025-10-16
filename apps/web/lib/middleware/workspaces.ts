import { UserProps } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { isValidInternalRedirect, parse } from "./utils";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getWorkspaceProduct } from "./utils/get-workspace-product";
import { isTopLevelSettingsRedirect } from "./utils/is-top-level-settings-redirect";

export default async function WorkspacesMiddleware(
  req: NextRequest,
  user: UserProps,
) {
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
    let redirectPath = path;
    if (["/", "/login", "/register", "/workspaces"].includes(path)) {
      redirectPath = "";
    } else if (isTopLevelSettingsRedirect(path)) {
      redirectPath = `/settings/${path}`;
    }

    if (!redirectPath) {
      const product = await getWorkspaceProduct(defaultWorkspace);
      redirectPath = `/${product}`;
    }

    return NextResponse.redirect(
      new URL(
        `/${defaultWorkspace}${redirectPath}${searchParamsString}`,
        req.url,
      ),
    );
  } else {
    return NextResponse.redirect(new URL("/onboarding/workspace", req.url));
  }
}
