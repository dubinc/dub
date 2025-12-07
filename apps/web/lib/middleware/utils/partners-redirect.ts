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
