import type { PlanProps } from "@/lib/types";
import {
  APPSFLYER_INTEGRATION_ID,
  SHOPIFY_INTEGRATION_ID,
  STRIPE_INTEGRATION_ID,
} from "@dub/utils";

// Route patterns for parameterized path matching.
// Used both for logging eligibility and route pattern extraction.
// Order matters: more specific patterns must come before less specific ones.
export const ROUTE_PATTERNS = [
  // Track
  "/track/lead",
  "/track/sale",
  "/track/open",

  // Partners
  "/partners/links/upsert",
  "/partners/links",
  "/partners/ban",
  "/partners/deactivate",
  "/partners/:partnerId",
  "/partners",

  // Links
  "/links/bulk",
  "/links/upsert",
  "/links/:linkId",
  "/links",

  // Customers
  "/customers/:id",
  "/customers",

  // Commissions
  "/commissions/bulk",
  "/commissions/:commissionId",
  "/commissions",

  // Bounties
  "/bounties/:bountyId/submissions/:submissionId/approve",
  "/bounties/:bountyId/submissions/:submissionId/reject",

  // Tokens
  "/tokens/embed/referrals",
] as const;

export const REQUEST_TYPES = [
  { value: "api", label: "API" },
  { value: "webhook", label: "Webhook" },
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

export const HTTP_METHODS = ["POST", "PATCH", "PUT", "DELETE", "GET"] as const;

export const HTTP_MUTATION_METHODS = HTTP_METHODS.filter(
  (method) => method !== "GET",
);

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

export const API_LOGS_PRESETS_BY_RETENTION: Record<number, string[]> = {
  30: ["24h", "7d", "30d"],
  60: ["24h", "7d", "30d"],
  90: ["24h", "7d", "30d", "90d"],
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

export const WEBHOOK_REQUEST_ACTORS_BY_PATH = {
  "/appsflyer/webhook": {
    id: APPSFLYER_INTEGRATION_ID,
    name: "AppsFlyer",
    image:
      "https://dubassets.com/integrations/int_1KN8JP7ET3VQQRF7ZQEVNFPJ5_2Geprc8",
  },
  "/stripe/integration/webhook": {
    id: STRIPE_INTEGRATION_ID,
    name: "Stripe",
    image:
      "https://dubassets.com/integrations/clzra1ya60001wnj4a89zcg9h_jtyaGa7",
  },
  "/shopify/integration/webhook": {
    id: SHOPIFY_INTEGRATION_ID,
    name: "Shopify",
    image:
      "https://dubassets.com/integrations/int_iWOtrZgmcyU6XDwKr4AYYqLN_jUmF77W",
  },
} as const;
