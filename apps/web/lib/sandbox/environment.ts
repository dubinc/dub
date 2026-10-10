// Client-safe environment checks. Kept separate from workspace-guards.ts because
// that module throws DubApiError from @/lib/api/errors (server-only), which
// breaks client components that only need these helpers.
import { WorkspaceEnvironment } from "@prisma/client";

export function isStagingEnvironment(
  environment: WorkspaceEnvironment | null | undefined,
) {
  return Boolean(environment && environment === WorkspaceEnvironment.staging);
}

export function isProductionEnvironment(
  environment: WorkspaceEnvironment | null | undefined,
) {
  return Boolean(
    environment && environment === WorkspaceEnvironment.production,
  );
}
