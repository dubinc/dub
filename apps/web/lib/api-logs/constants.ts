export const LOGGED_API_PATH_PATTERNS = [
  "/api/track/lead",
  "/api/track/sale",
  "/api/track/open",
  "/api/partners/**",
  "/api/tokens/embed/referrals",
  "/api/customers/**",
  "/api/links/**",
  "/api/commissions/**",
  "/api/bounties/**",
] as const;

// Route patterns for parameterized path matching.
// Order matters: more specific patterns must come before less specific ones.
export const ROUTE_PATTERNS = [
  // Track
  "api/track/lead",
  "api/track/sale",
  "api/track/open",

  // Links
  "api/links/:linkId/dashboard",
  "api/links/:linkId/transfer",
  "api/links/:linkId",
  "api/links/bulk",
  "api/links/count",
  "api/links/exists",
  "api/links/export",
  "api/links/info",
  "api/links/upsert",
  "api/links",

  // Partners
  "api/partners/:partnerId/application-risks",
  "api/partners/:partnerId/comments/count",
  "api/partners/:partnerId/comments",
  "api/partners/:partnerId/cross-program-summary",
  "api/partners/:partnerId",
  "api/partners/analytics",
  "api/partners/ban",
  "api/partners/count",
  "api/partners/deactivate",
  "api/partners/export",
  "api/partners/links/upsert",
  "api/partners/links",
  "api/partners/platforms/callback",
  "api/partners",

  // Customers
  "api/customers/:id/activity",
  "api/customers/:id/stripe-invoices",
  "api/customers/:id",
  "api/customers/count",
  "api/customers/export",
  "api/customers/search-stripe",
  "api/customers",

  // Commissions
  "api/commissions/:commissionId",
  "api/commissions/bulk",
  "api/commissions/count",
  "api/commissions/export",
  "api/commissions/timeseries",
  "api/commissions",

  // Bounties
  "api/bounties/:bountyId/submissions/:submissionId/approve",
  "api/bounties/:bountyId/submissions/:submissionId/reject",
  "api/bounties/:bountyId/submissions",
  "api/bounties/:bountyId/sync-social-metrics",
  "api/bounties/:bountyId",
  "api/bounties/count/submissions",
  "api/bounties",

  // Tokens
  "api/tokens/embed/referrals",
  "api/tokens/:id",
  "api/tokens",
] as const;

export const HTTP_STATUS_CODES = [
  { value: 200, label: "200 OK" },
  { value: 201, label: "201 Created" },
  { value: 400, label: "400 Bad Request" },
  { value: 401, label: "401 Unauthorized" },
  { value: 403, label: "403 Forbidden" },
  { value: 404, label: "404 Not Found" },
  { value: 409, label: "409 Conflict" },
  { value: 422, label: "422 Unprocessable" },
  { value: 429, label: "429 Rate Limited" },
  { value: 500, label: "500 Server Error" },
] as const;

export const HTTP_METHODS = ["POST", "PATCH", "PUT", "DELETE"] as const;

export const API_LOGS_MAX_PAGE_SIZE = 50;

export const API_LOG_RETENTION_DAYS: Record<string, number> = {
  free: 30,
  pro: 30,
  enterprise: 90,
};

export const DEFAULT_RETENTION_DAYS = 60; // business, advanced

export const METHOD_BADGE_VARIANTS: Record<
  (typeof HTTP_METHODS)[number],
  string
> = {
  POST: "new",
  PATCH: "warning",
  PUT: "neutral",
  DELETE: "error",
} as const;
