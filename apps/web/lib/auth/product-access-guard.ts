import { ACME_WORKSPACE_ID } from "@dub/utils";
import { normalizeWorkspaceId } from "../api/workspaces/workspace-id";

// Hardcoded restriction of program access per workspace user.
// Maps workspace ID -> user IDs that should NOT have access to the program.
export const PROGRAM_ACCESS_BLOCKLIST: Record<string, string[]> = {
  [ACME_WORKSPACE_ID]: [
    "user_1KEZYSWJN73HPY852GHAEADK8", // steven+test+viewer@dub.co
  ],
};

export const canAccessProgram = ({
  workspaceId,
  userId,
}: {
  workspaceId?: string | null;
  userId?: string | null;
}): boolean => {
  if (!workspaceId || !userId) {
    return true; // no info -> don't restrict
  }

  const blocked = PROGRAM_ACCESS_BLOCKLIST[normalizeWorkspaceId(workspaceId)];

  return blocked ? !blocked.includes(userId) : true;
};

// API path namespaces that belong to the program product.
// Centralized here so the restricted surface is easy to review/adjust.
// /api/analytics and /api/customers are intentionally omitted — both products
// use them (e.g. link analytics vs. program analytics), so blocking at the path
// level would break Dub Links for restricted users.
export const PROGRAM_API_PATHS = [
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

export const isProgramApiPath = (pathname: string): boolean =>
  PROGRAM_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
