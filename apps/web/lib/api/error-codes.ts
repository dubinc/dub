import * as z from "zod/v4";

export const ErrorCodes = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  exceeded_limit: 403,
  not_found: 404,
  conflict: 409,
  invite_pending: 409,
  invite_expired: 410,
  unprocessable_entity: 422,
  rate_limit_exceeded: 429,
  internal_server_error: 500,
} as const;

export const ErrorCode = z.enum(
  Object.keys(ErrorCodes) as [string, ...string[]],
);
