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
  searchParamsObj: Record<string, string>,
) => {
  if (path === "/programs/marketplace") {
    if (searchParamsObj.category) {
      return `/marketplace/c/${searchParamsObj.category.toLowerCase()}`;
    }
    return "/marketplace/all";
  }

  const match = path.match(/^\/programs\/marketplace\/([^/]+)$/);

  if (match) {
    return `/marketplace/${match[1]}`;
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
  "voice-os": "voiceos",
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
