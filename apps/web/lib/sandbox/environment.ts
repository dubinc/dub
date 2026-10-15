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

export function isSandboxEnvironment(
  environment: WorkspaceEnvironment | null | undefined,
) {
  return Boolean(environment && environment === WorkspaceEnvironment.sandbox);
}

export function getPublishableKeyPrefix(
  environment: WorkspaceEnvironment | null | undefined,
) {
  return isProductionEnvironment(environment) ? "dub_pk_" : "dub_pk_test_";
}

export function isValidPublishableKeyForEnvironment(
  publishableKey: string,
  environment: WorkspaceEnvironment | null | undefined,
) {
  const isTestKey = publishableKey.startsWith("dub_pk_test_");

  return isProductionEnvironment(environment)
    ? publishableKey.startsWith("dub_pk_") && !isTestKey
    : isTestKey;
}
