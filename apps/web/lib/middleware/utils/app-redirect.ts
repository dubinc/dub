import { getDubProductFromCookie } from "@/lib/middleware/utils/get-dub-product-from-cookie";
import { RESERVED_SLUGS } from "@dub/utils";

const APP_REDIRECTS = {
  "/account": "/account/settings",
  "/referrals": "/account/settings/referrals",
  "/onboarding": "/onboarding/welcome",
  "/welcome": "/onboarding/welcome",
};

const PROGRAM_REDIRECTS = {
  "/program/settings": "/program",
  "/program/settings/links": "/program/link-settings",
  "/program/sales": "/program/commissions",
  "/program/communication": "/program/resources",
  "/program/branding/resources": "/program/resources",
  "/program/rewards": "/program/groups/default/rewards",
  "/program/discounts": "/program/groups/default/discounts",
  "/program/link-settings": "/program/groups/default/links",
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
  const oldProgramPagesRegex = /^\/([^\/]+)\/programs\/prog_[^\/]+\/(.*)$/;
  if (oldProgramPagesRegex.test(path))
    return path.replace(oldProgramPagesRegex, "/$1/program/$2");

  // Redirect "/[slug]/programs/:path*" to "/[slug]/program/:path*" (including root path)
  const programsPluralRegex = /^\/([^\/]+)\/programs(?:\/(.*))?$/;
  if (programsPluralRegex.test(path))
    return path.replace(
      programsPluralRegex,
      (_match, slug, subPath) =>
        `/${slug}/program${subPath ? `/${subPath}` : ""}`,
    );

  // Redirect "/[slug]/program/groups/:groupSlug" to "/[slug]/program/groups/:groupSlug/rewards"
  const groupRegex = /^\/([^\/]+)\/program\/groups\/([^\/]+)$/;
  if (groupRegex.test(path))
    return path.replace(groupRegex, "/$1/program/groups/$2/rewards");

  // Handle additional simpler program redirects
  const programRedirect = Object.keys(PROGRAM_REDIRECTS).find((redirect) =>
    path.endsWith(redirect),
  );
  if (programRedirect) {
    return path.replace(programRedirect, PROGRAM_REDIRECTS[programRedirect]);
  }

  return null;
};
