// TEMPORARY: hardcoded restriction of Dub Partners access per workspace user.
// Maps workspace ID -> user IDs that should NOT have access to Dub Partners.
export const DUB_PARTNERS_ACCESS_BLOCKLIST: Record<string, string[]> = {
  // "ws_xxx": ["user_aaa", "user_bbb"],
  ws_1KETZ919F83ZJH6A80HWEHW6E: ["user_cludszk1h0000wmd2e0ea2b0p"],
};

export const canAccessDubPartners = ({
  workspaceId,
  userId,
}: {
  workspaceId?: string | null;
  userId?: string | null;
}): boolean => {
  if (!workspaceId || !userId) {
    return true; // no info -> don't restrict
  }

  const blocked = DUB_PARTNERS_ACCESS_BLOCKLIST[workspaceId];

  return blocked ? !blocked.includes(userId) : true;
};

// API path namespaces that belong to Dub Partners.
// Centralized here so the restricted surface is easy to review/adjust.
export const DUB_PARTNERS_API_PATHS = [
  "/api/programs",
  "/api/partners",
  "/api/commissions",
  "/api/payouts",
  "/api/rewards",
  "/api/bounties",
  "/api/groups",
  "/api/network",
  "/api/discount-codes",
  "/api/campaigns",
  "/api/fraud",
  "/api/messages",
  "/api/email-domains",
];

export const isDubPartnersApiPath = (pathname: string): boolean =>
  DUB_PARTNERS_API_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
