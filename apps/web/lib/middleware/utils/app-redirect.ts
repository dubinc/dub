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

  // Redirect "/[slug]/programs/prog_[id]/:path*" to "/[slug]/program/:path*"
  const programRegex = /^\/([^\/]+)\/programs\/prog_[^\/]+\/(.*)$/;
  if (programRegex.test(path))
    return path.replace(programRegex, "/$1/program/$2");

  // Redirect "program/settings" to "program/settings/rewards" (first tab)
  const programSettingsRegex = /\/program\/settings$/;
  if (programSettingsRegex.test(path))
    return path.replace(programSettingsRegex, "/program/settings/rewards");

  // Redirect "program/settings/branding" to "program/branding"
  const programSettingsBrandingRegex = /\/program\/settings\/branding$/;
  if (programSettingsBrandingRegex.test(path))
    return path.replace(programSettingsBrandingRegex, "/program/branding");

  // Redirect "/[slug]/program/sales" to "/[slug]/program/commissions"
  const salesRegex = /^\/([^\/]+)\/program\/sales$/;
  if (salesRegex.test(path))
    return path.replace(salesRegex, "/$1/program/commissions");

  return null;
};
