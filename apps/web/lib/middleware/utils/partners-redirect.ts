const PARTNERS_REDIRECTS = {
  "/settings": "/profile",
  "/settings/payouts": "/payouts",
  "/settings/notifications": "/profile/notifications",
  "/account/settings/notifications": "/profile/notifications",
  "/profile/sites": "/profile",
  "/marketplace": "/programs/marketplace",
};

export const partnersRedirect = (path: string) => {
  if (PARTNERS_REDIRECTS[path]) return PARTNERS_REDIRECTS[path];

  return null;
};

const PARTNERS_PROGRAM_REDIRECTS = {
  "ship-30": "dwp",
  supercutai: "supercut",
  "teller-perps": "teller",
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
