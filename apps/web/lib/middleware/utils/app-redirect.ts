const APP_REDIRECTS = {
  "/account": "/account/settings",
};

export const appRedirect = (path: string) => {
  // Use a regex to match both "/settings/library" and "/settings/tags"
  const libraryTagsRegex = /\/settings\/(library|tags)$/;
  if (libraryTagsRegex.test(path)) {
    return path.replace(libraryTagsRegex, "/settings/library/tags");
  } else if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }
  return null;
};
