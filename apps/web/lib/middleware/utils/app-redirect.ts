const EXCLUDED_PAGES = ["/workspaces"];

const APP_REDIRECTS = {
  "/account": "/account/settings",
  "/onboarding": "/onboarding/welcome",
  "/welcome": "/onboarding/welcome",
};

export const appRedirect = async (path: string) => {
  if (EXCLUDED_PAGES.includes(path)) {
    return null;
  }

  if (APP_REDIRECTS[path]) {
    return APP_REDIRECTS[path];
  }

  // Redirect "/[slug]" and "/[slug]/analytics|events|customers" to "/[slug]/links/..."
  const workspaceLinksPathRegex =
    /^\/([^\/]+)(?:\/(analytics|events|customers))?$/;
  const workspaceLinksPathMatch = path.match(workspaceLinksPathRegex);
  if (workspaceLinksPathMatch) {
    const [, slug, subPath] = workspaceLinksPathMatch;
    return subPath ? `/${slug}/links/${subPath}` : `/${slug}/links`;
  }

  // Redirect "/[slug]/upgrade" to "/[slug]/settings/billing/upgrade"
  const upgradeRegex = /^\/([^\/]+)\/upgrade$/;
  if (upgradeRegex.test(path))
    return path.replace(upgradeRegex, "/$1/settings/billing/upgrade");

  // Redirect "/[slug]/guides" and all child paths to "/[slug]/settings/tracking"
  const guidesRegex = /^\/([^\/]+)\/guides(?:\/(.*))?$/;
  if (guidesRegex.test(path))
    return path.replace(guidesRegex, "/$1/settings/tracking");

  // Redirect "/[slug]/settings/library/:path*" to "/[slug]/links/:path*"
  const libraryRegex = /^\/([^\/]+)\/settings\/library\/(.*)$/;
  if (libraryRegex.test(path))
    return path.replace(libraryRegex, "/$1/links/$2");

  // Redirect "/[slug]/settings/people" to "/[slug]/settings/members"
  const peopleRegex = /^\/([^\/]+)\/settings\/people$/;
  if (peopleRegex.test(path))
    return path.replace(peopleRegex, "/$1/settings/members");

  // Redirect "/[slug]/settings/analytics" to "/[slug]/settings/tracking"
  const settingsAnalyticsRegex = /^\/([^\/]+)\/settings\/analytics$/;
  if (settingsAnalyticsRegex.test(path))
    return path.replace(settingsAnalyticsRegex, "/$1/settings/tracking");

  // Redirect "/[slug]/[*]/customers/:customerId" to "/[slug]/[*]/customers/:customerId/sales"
  const customersPageRegex = /^\/([^\/]+)\/([^\/]+)\/customers\/([^\/]+)$/;
  if (customersPageRegex.test(path))
    return path.replace(customersPageRegex, "/$1/$2/customers/$3/sales");

  return null;
};
