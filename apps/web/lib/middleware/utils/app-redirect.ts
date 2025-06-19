import { getDubProductFromCookie } from "@/lib/middleware/utils/get-dub-product-from-cookie";
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

  // Redirect "/[slug]" to "/[slug]/[product]"
  const rootRegex = /^\/([^\/]+)$/;
  if (rootRegex.test(path) && !RESERVED_SLUGS.includes(path.split("/")[1])) {
    const product = getDubProductFromCookie(path.split("/")[1]);
    return path.replace(rootRegex, `/$1/${product}`);
  }

  // Redirect "/[slug]/upgrade" to "/[slug]/settings/billing/upgrade"
  const upgradeRegex = /^\/([^\/]+)\/upgrade$/;
  if (upgradeRegex.test(path))
    return path.replace(upgradeRegex, "/$1/settings/billing/upgrade");

  // Redirect "/[slug]/settings/library/:path*" to "/[slug]/links/:path*"
  const libraryRegex = /^\/([^\/]+)\/settings\/library\/(.*)$/;
  if (libraryRegex.test(path))
    return path.replace(libraryRegex, "/$1/links/$2");

  // Redirect "/[slug]/programs/prog_[id]/:path*" to "/[slug]/program/:path*"
  const programPagesRegex = /^\/([^\/]+)\/programs\/prog_[^\/]+\/(.*)$/;
  if (programPagesRegex.test(path))
    return path.replace(programPagesRegex, "/$1/program/$2");

  // Redirect "/[slug]/programs/:path*" to "/[slug]/program/:path*" (including root path)
  const programRootRegex = /^\/([^\/]+)\/programs(?:\/(.*))?$/;
  if (programRootRegex.test(path))
    return path.replace(
      programRootRegex,
      (_match, slug, subPath) =>
        `/${slug}/program${subPath ? `/${subPath}` : ""}`,
    );

  // Redirect "/[slug]/program/settings" to "/[slug]/program"
  const programSettingsRootRegex = /\/program\/settings$/;
  if (programSettingsRootRegex.test(path))
    return path.replace(programSettingsRootRegex, "/program");

  // Redirect "/[slug]/program/settings/links" to "/[slug]/program/link-settings"
  const programSettingsLinksRegex = /\/program\/settings\/links$/;
  if (programSettingsLinksRegex.test(path))
    return path.replace(programSettingsLinksRegex, "/program/link-settings");

  // Redirect "/[slug]/program/settings/:path" to "/[slug]/program/:path"
  const programSettingsPathRegex = /^\/([^\/]+)\/program\/settings\/(.*)$/;
  if (programSettingsPathRegex.test(path))
    return path.replace(programSettingsPathRegex, "/$1/program/$2");

  // Redirect "/[slug]/program/sales" to "/[slug]/program/commissions"
  const programSalesRegex = /^\/([^\/]+)\/program\/sales$/;
  if (programSalesRegex.test(path))
    return path.replace(programSalesRegex, "/$1/program/commissions");

  return null;
};
