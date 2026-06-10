import { getMarketplacePopularRedirectHref } from "@/ui/partners/program-marketplace/utils/urls";

const PARTNERS_REDIRECTS = {
  "/settings": "/profile",
  "/settings/payouts": "/payouts",
  "/settings/notifications": "/profile/notifications",
  "/account/settings/notifications": "/profile/notifications",
  "/profile/sites": "/profile",
  "/rewind": "/rewind/2025",
  "/onboarding/online-presence": "/onboarding/platforms",
  "/onboarding/verify": "/onboarding/payouts",
};

export const partnersRedirect = (path: string) => {
  return PARTNERS_REDIRECTS[path] || null;
};

export const partnersMarketplaceRedirects = (
  path: string,
  searchParams: Record<string, string | string[] | undefined> = {},
) => {
  if (path === "/programs/marketplace") {
    return "/marketplace";
  }

  if (path === "/programs/marketplace/all") {
    return "/marketplace/all";
  }

  if (
    path === "/programs/marketplace/popular" ||
    path === "/marketplace/popular"
  ) {
    return getMarketplacePopularRedirectHref(searchParams);
  }

  const match = path.match(/^\/programs\/marketplace\/([^/]+)$/);

  if (match) {
    const slug = match[1];

    if (slug === "all") {
      return "/marketplace/all";
    }

    if (slug === "popular") {
      return getMarketplacePopularRedirectHref(searchParams);
    }

    return `/marketplace/${slug}`;
  }

  return null;
};

const PARTNERS_PROGRAM_REDIRECTS = {
  florafauna: "flora",
  "ship-30": "dwp",
  supercutai: "supercut",
  "teller-perps": "teller",
  "hundred-health": "hundred",
  "gitroom-short": "postiz",
  "getviktor-com": "viktor",
  getviktor: "viktor",
  heynavii: "navii",
  galaxyai: "magica",
};

export const partnersProgramRedirects = (path: string) => {
  const programRedirect = Object.keys(PARTNERS_PROGRAM_REDIRECTS).find(
    (redirect) => path === `/${redirect}` || path.includes(`/${redirect}/`),
  );
  if (programRedirect) {
    return path.replace(
      programRedirect,
      PARTNERS_PROGRAM_REDIRECTS[programRedirect],
    );
  }
  return null;
};
