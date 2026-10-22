import { WorkspaceEnvironment } from "@prisma/client";
import { isProductionEnvironment } from "./environment";

/**
 * Public program landers should only be indexed when they are published on a
 * production program. Staging/sandbox landers stay crawlable for testing but
 * must not emit indexable SEO; unpublished landers must not soft-404 with rich
 * metadata either.
 */
export function shouldIndexProgramLander({
  environment,
  landerPublishedAt,
}: {
  environment: WorkspaceEnvironment | null | undefined;
  landerPublishedAt: Date | string | null | undefined;
}) {
  return isProductionEnvironment(environment) && Boolean(landerPublishedAt);
}
