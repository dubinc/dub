// Hardcoded restriction of admin dashboard tabs per Dub admin user.
// User IDs listed here will NOT have access to ADMIN_RESTRICTED_PATHS.
export const ADMIN_ACCESS_BLOCKLIST: string[] = [
  "user_1M3YFDDQ97AGTKWQ9NCSRQTYB",
];

export const ADMIN_RESTRICTED_PATHS = ["/links", "/revenue", "/domains"];

const ADMIN_RESTRICTED_API_PATHS = [
  "/api/admin/links",
  "/api/admin/workspaces",
  "/api/admin/revenue",
  "/api/admin/domains",
];

const matchesPath = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const isAdminAccessRestricted = (userId?: string | null): boolean =>
  !!userId && ADMIN_ACCESS_BLOCKLIST.includes(userId);

export const canAccessAdminPath = ({
  userId,
  pathname,
}: {
  userId?: string | null;
  pathname: string;
}): boolean =>
  !isAdminAccessRestricted(userId) ||
  !matchesPath(pathname, ADMIN_RESTRICTED_PATHS);

export const canAccessAdminApiPath = ({
  userId,
  pathname,
}: {
  userId?: string | null;
  pathname: string;
}): boolean =>
  !isAdminAccessRestricted(userId) ||
  !matchesPath(pathname, ADMIN_RESTRICTED_API_PATHS);
