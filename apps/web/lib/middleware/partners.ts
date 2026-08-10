import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "../better-auth/get-session";
import { getDefaultPartnerId } from "./utils/get-default-partner";
import { isValidInternalRedirect } from "./utils/is-valid-internal-redirect";
import { parse } from "./utils/parse";
import {
  partnersMarketplaceRedirects,
  partnersProgramRedirects,
  partnersRedirect,
} from "./utils/partners-redirect";

const AUTHENTICATED_PATHS = [
  "/programs",
  "/marketplace",
  "/onboarding",
  "/settings",
  "/profile",
  "/messages",
  "/payouts",
  "/account",
  "/invite",
  "/rewind",
];

function redirectWithQuery(
  path: string,
  req: NextRequest,
  query: Record<string, string | undefined>,
) {
  const url = new URL(path, req.url);

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url);
}

export async function PartnersMiddleware(req: NextRequest) {
  const { path, fullPath, searchParamsObj, searchParamsString } = parse(req);
  // Preserve program SSO ?connect= across auth redirects (slug-shaped only).
  const connect =
    searchParamsObj.connect && /^[a-z0-9-]+$/i.test(searchParamsObj.connect)
      ? searchParamsObj.connect
      : undefined;

  const { user } = await getServerSession(req.headers);
  const isPartnerInvite = req.nextUrl.pathname.endsWith("/invite");

  const isAuthenticatedPath = AUTHENTICATED_PATHS.some(
    (p) => path === "/" || path.startsWith(p),
  );

  const isLoginPath = ["/login", "/register"].some(
    (p) => path.startsWith(p) || path.endsWith(p),
  );

  if (partnersMarketplaceRedirects(path, searchParamsObj)) {
    return NextResponse.redirect(
      new URL(
        `${partnersMarketplaceRedirects(path, searchParamsObj)}${searchParamsString}`,
        req.url,
      ),
      {
        status: 301,
      },
    );
  }

  if (partnersProgramRedirects(path)) {
    return NextResponse.redirect(
      new URL(
        `${partnersProgramRedirects(path)}${searchParamsString}`,
        req.url,
      ),
      {
        status: 301,
      },
    );
  }

  if (!user && isAuthenticatedPath) {
    if (path.startsWith("/programs/")) {
      const programSlug = path.split("/")[2];
      return NextResponse.redirect(new URL(`/${programSlug}/login`, req.url));
    }

    return NextResponse.redirect(
      new URL(
        `/login${path === "/" ? "" : `?next=${encodeURIComponent(fullPath)}`}`,
        req.url,
      ),
    );
  } else if (user && (isAuthenticatedPath || isLoginPath)) {
    const defaultPartnerId = await getDefaultPartnerId(user);

    if (
      !defaultPartnerId &&
      !isPartnerInvite &&
      !["/onboarding", "/account"].some((p) => path.startsWith(p))
    ) {
      return redirectWithQuery(
        path === "/"
          ? "/onboarding"
          : `/onboarding?next=${encodeURIComponent(fullPath)}`,
        req,
        { connect },
      );
    }

    // Handle ?next= query param with proper validation to prevent open redirects
    // (omit /onboarding from the check to make sure onboarding is completed)
    if (
      searchParamsObj.next &&
      isValidInternalRedirect({
        redirectPath: searchParamsObj.next,
        currentUrl: req.url,
      }) &&
      !path.startsWith("/onboarding")
    ) {
      return NextResponse.redirect(new URL(searchParamsObj.next, req.url));
    }

    if (path === "/" || path.startsWith("/pn_")) {
      return redirectWithQuery("/programs", req, { connect });
    } else if (isLoginPath) {
      // if is custom program login or register path, redirect to /programs/:programSlug
      const programSlugRegex = /^\/([^\/]+)\/(login|register)$/;
      const match = path.match(programSlugRegex);
      if (match) {
        return NextResponse.redirect(new URL(`/programs/${match[1]}`, req.url));
      }
      // Redirect authenticated users to dashboard (keep ?connect for SSO linking)
      return redirectWithQuery("/", req, { connect });
    } else if (partnersRedirect(path)) {
      return NextResponse.redirect(
        new URL(`${partnersRedirect(path)}${searchParamsString}`, req.url),
      );
    }
  }

  return NextResponse.rewrite(new URL(`/partners.dub.co${fullPath}`, req.url));
}
