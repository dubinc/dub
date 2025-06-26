const PARTNERS_REDIRECTS = {
  "/settings": "/profile",
};

export const partnersRedirect = (path: string) => {
  if (PARTNERS_REDIRECTS[path]) return PARTNERS_REDIRECTS[path];

  return null;
};
