import { RESERVED_SLUGS } from "@dub/utils";

const APP_REDIRECTS = {
  "/account": "/account/settings",
  "/referrals": "/account/settings/referrals",
  "/onboarding": "/onboarding/welcome",
  "/welcome": "/onboarding/welcome",
};

export const appRedirect = (path: string) => {
  if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }
  // Redirect "/[slug]" to "/[slug]/links"
  const rootRegex = /^\/([^\/]+)$/;
  if (rootRegex.test(path) && !RESERVED_SLUGS.includes(path.split("/")[1]))
    return path.replace(rootRegex, "/$1/links");

  // Redirect "/[slug]/upgrade" to "/[slug]/settings/billing/upgrade"
  const upgradeRegex = /^\/([^\/]+)\/upgrade$/;
  if (upgradeRegex.test(path))
    return path.replace(upgradeRegex, "/$1/settings/billing/upgrade");

  // Redirect "/[slug]/customers" to "/[slug]/events?event=lead" for now
  const customersRegex = /^\/([^\/]+)\/customers$/;
  if (customersRegex.test(path))
    return path.replace(customersRegex, "/$1/events?event=lead");

  // Redirect "programs/[programId]/settings" to "programs/[programId]/settings/rewards" (first tab)
  const programSettingsRegex = /\/programs\/([^\/]+)\/settings$/;
  if (programSettingsRegex.test(path))
    return path.replace(programSettingsRegex, "/programs/$1/settings/rewards");

  // Redirect "/[slug]/programs/[programId]/sales" to "/[slug]/programs/[programId]/commissions"
  const salesRegex = /^\/([^\/]+)\/programs\/([^\/]+)\/sales$/;
  if (salesRegex.test(path))
    return path.replace(salesRegex, "/$1/programs/$2/commissions");

  return null;
};
