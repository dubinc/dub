import { UserProps } from "@/lib/types";
import { prismaEdge } from "@dub/prisma/edge";
import { NextRequest, NextResponse } from "next/server";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { getWorkspaceProduct } from "./utils/get-workspace-product";
import { isTopLevelSettingsRedirect } from "./utils/is-top-level-settings-redirect";
import { isValidInternalRedirect } from "./utils/is-valid-internal-redirect";
import { parse } from "./utils/parse";

export async function WorkspacesMiddleware(req: NextRequest, user: UserProps) {
  const { path, searchParamsObj, searchParamsString } = parse(req);

  // Handle ?next= query param with proper validation to prevent open redirects
  if (
    searchParamsObj.next &&
    isValidInternalRedirect(searchParamsObj.next, req.url)
  ) {
    return NextResponse.redirect(new URL(searchParamsObj.next, req.url));
  }

  const defaultWorkspace = await getDefaultWorkspace(user);

  // If user has a default workspace, redirect them to it
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
  }

  // Redirect user to the accept invite modal if they have a pending invite
  const projectInvite = await prismaEdge.projectInvite.findFirst({
    where: {
      email: user.email,
    },
    select: {
      project: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (projectInvite) {
    return NextResponse.redirect(
      new URL(`/${projectInvite.project.slug}?invite=1`, req.url),
    );
  }

  // No default workspace or invite found, redirect to workspace onboarding
  return NextResponse.redirect(new URL("/onboarding/workspace", req.url));
}
