const PARTNERS_REDIRECTS = {
  "/settings": "/profile",
  "/settings/payouts": "/payouts",
  "/settings/notifications": "/account/settings/notifications",
};

export const partnersRedirect = (path: string) => {
  if (PARTNERS_REDIRECTS[path]) return PARTNERS_REDIRECTS[path];

  return null;
};
