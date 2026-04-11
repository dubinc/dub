import type { PlanProps } from "@/lib/types";

// Route patterns for parameterized path matching.
// Used both for logging eligibility and route pattern extraction.
// Order matters: more specific patterns must come before less specific ones.
export const ROUTE_PATTERNS = [
  // Track
  "api/track/lead",
  "api/track/sale",
  "api/track/open",

  // Partners
  "api/partners/links/upsert",
  "api/partners/links",
  "api/partners/ban",
  "api/partners/deactivate",
  "api/partners/:partnerId",
  "api/partners",

  // Links
  "api/links/bulk",
  "api/links/upsert",
  "api/links/:linkId",
  "api/links",

  // Customers
  "api/customers/:id",
  "api/customers",

  // Commissions
  "api/commissions/bulk",
  "api/commissions/:commissionId",
  "api/commissions",

  // Bounties
  "api/bounties/:bountyId/submissions/:submissionId/approve",
  "api/bounties/:bountyId/submissions/:submissionId/reject",

  // Tokens
  "api/tokens/embed/referrals",
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

export const HTTP_MUTATION_METHODS = [
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
] as const;

export const HTTP_METHODS = ["POST", "PATCH", "PUT", "DELETE", "GET"] as const;

export const API_LOGS_MAX_PAGE_SIZE = 50;

export const API_LOG_RETENTION_DAYS: Record<PlanProps, number> = {
  free: 30,
  pro: 30,
  business: 60,
  "business plus": 60,
  "business extra": 60,
  "business max": 60,
  advanced: 60,
  enterprise: 90,
};

// Default when plan is missing from workspace data (should not happen for known plans).
export const DEFAULT_RETENTION_DAYS = 30;

export const METHOD_BADGE_VARIANTS: Record<string, string> = {
  POST: "new",
  PATCH: "warning",
  PUT: "pending",
  DELETE: "error",
  GET: "success",
} as const;

export const WEBHOOK_DISPLAY_NAMES: Record<string, string> = {
  "/api/appsflyer/webhook": "AppsFlyer",
  "/api/stripe/integration/webhook": "Stripe",
  "/api/shopify/integration/webhook": "Shopify",
};
