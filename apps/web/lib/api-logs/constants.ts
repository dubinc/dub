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
