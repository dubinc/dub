import { RESERVED_SLUGS } from "@dub/utils";
import { getWorkspaceProduct } from "./get-workspace-product";

const APP_REDIRECTS = {
  "/account": "/account/settings",
  "/referrals": "/account/settings/referrals",
  "/onboarding": "/onboarding/welcome",
  "/welcome": "/onboarding/welcome",
  "/campaigns": "/program/campaigns",
  "/messages": "/program/messages",
  "/network": "/program/network",
  "/marketplace": "/program/network",
  "/fraud": "/program/fraud",
};

const PROGRAM_REDIRECTS = {
  "/program/settings": "/program",
  "/program/settings/links": "/program/link-settings",
  "/program/sales": "/program/commissions",
  "/program/communication": "/program/resources",
  "/program/rewards": "/program/groups/default/rewards",
  "/program/discounts": "/program/groups/default/discounts",
  "/program/link-settings": "/program/groups/default/links",
  "/program/branding": "/program/groups/default/branding",
};

export const appRedirect = async (path: string) => {
  if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }

  // Redirect "/[slug]" to "/[slug]/[product]"
  const rootRegex = /^\/([^\/]+)$/;
  if (rootRegex.test(path) && !RESERVED_SLUGS.includes(path.split("/")[1])) {
    const product = await getWorkspaceProduct(path.split("/")[1]);
    return path.replace(rootRegex, `/$1/${product}`);
  }

  // Redirect "/[slug]/upgrade" to "/[slug]/settings/billing/upgrade"
  const upgradeRegex = /^\/([^\/]+)\/upgrade$/;
  if (upgradeRegex.test(path))
    return path.replace(upgradeRegex, "/$1/settings/billing/upgrade");

  // Redirect "/[slug]/guides" and all child paths to "/[slug]/settings/analytics"
  const guidesRegex = /^\/([^\/]+)\/guides(?:\/(.*))?$/;
  if (guidesRegex.test(path))
    return path.replace(guidesRegex, "/$1/settings/analytics");

  // Redirect "/[slug]/settings/library/:path*" to "/[slug]/links/:path*"
  const libraryRegex = /^\/([^\/]+)\/settings\/library\/(.*)$/;
  if (libraryRegex.test(path))
    return path.replace(libraryRegex, "/$1/links/$2");

  // Redirect "/[slug]/settings/people" to "/[slug]/settings/members"
  const peopleRegex = /^\/([^\/]+)\/settings\/people$/;
  if (peopleRegex.test(path))
    return path.replace(peopleRegex, "/$1/settings/members");

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

  // Redirect "/[slug]/program/partners/:partnerId" to "/[slug]/program/partners/:partnerId/links"
  // Only applies when partnerId starts with "pn_" (exclude /applications)
  const partnerPageRegex = /^\/([^\/]+)\/program\/partners\/(pn_[^\/]+)$/;
  if (partnerPageRegex.test(path))
    return path.replace(partnerPageRegex, "/$1/program/partners/$2/links");

  // Redirect "/[slug]/customers/:customerId" to "/[slug]/customers/:customerId/sales"
  const customersPageRegex = /^\/([^\/]+)\/customers\/([^\/]+)$/;
  if (customersPageRegex.test(path))
    return path.replace(customersPageRegex, "/$1/customers/$2/sales");

  // Redirect "/[slug]/program/customers/:customerId" to "/[slug]/program/customers/:customerId/sales"
  const programCustomersPageRegex =
    /^\/([^\/]+)\/program\/customers\/([^\/]+)$/;
  if (programCustomersPageRegex.test(path))
    return path.replace(
      programCustomersPageRegex,
      "/$1/program/customers/$2/sales",
    );

  // Handle additional simpler program redirects
  const programRedirect = Object.keys(PROGRAM_REDIRECTS).find((redirect) =>
    path.endsWith(redirect),
  );
  if (programRedirect) {
    return path.replace(programRedirect, PROGRAM_REDIRECTS[programRedirect]);
  }

  return null;
};
