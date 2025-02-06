const APP_REDIRECTS = {
  "/account": "/account/settings",
  "/referrals": "/account/settings/referrals",
  "/welcome": "/onboarding",
};

export const appRedirect = (path: string) => {
  // Use a regex to match both "/settings/library" and "/settings/tags"
  const libraryTagsRegex = /\/settings\/(library|tags)$/;
  if (libraryTagsRegex.test(path)) {
    return path.replace(libraryTagsRegex, "/settings/library/tags");
  } else if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }

  // Redirect "programs/[programId]/settings" to "programs/[programId]/settings/rewards" (first tab)
  const programSettingsRegex = /\/programs\/([^\/]+)\/settings$/;
  if (programSettingsRegex.test(path))
    return path.replace(programSettingsRegex, "/programs/$1/settings/rewards");

  return null;
};
