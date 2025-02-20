const APP_REDIRECTS = {
  "/account": "/account/settings",
  "/referrals": "/account/settings/referrals",
  "/welcome": "/onboarding",
};

export const appRedirect = (path: string) => {
  if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }

  // Redirect "programs/[programId]/settings" to "programs/[programId]/settings/rewards" (first tab)
  const programSettingsRegex = /\/programs\/([^\/]+)\/settings$/;
  if (programSettingsRegex.test(path))
    return path.replace(programSettingsRegex, "/programs/$1/settings/rewards");

  return null;
};
