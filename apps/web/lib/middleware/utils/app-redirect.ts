const APP_REDIRECTS = {
  "/account": "/account/settings",
};

export const appRedirect = (path: string) => {
  if (path.endsWith("/settings/library") || path.endsWith("/settings/tags")) {
    return "/settings/library/tags";
  } else if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }
  return null;
};
