import { Link } from "@dub/prisma/client";

/**
 * Prisma `where` fragment for filtering by linkId.
 * Use in direct queries: where: { ...linkScopeFilter(assignedLinks) }
 */
export function linkScopeFilter(
  assignedLinks: Pick<Link, "id">[] | undefined,
): {
  linkId?: { in: string[] };
} {
  if (assignedLinks === undefined) {
    return {};
  }

  return {
    linkId: {
      in: assignedLinks.map(({ id }) => id),
    },
  };
}

/**
 * Prisma `include.links` value for getProgramEnrollmentOrThrow calls.
 * Returns `true` (all links) or `{ where: { id: { in: ... } } }` (scoped).
 */
export function linkIncludeFilter(
  assignedLinks: Pick<Link, "id">[] | undefined,
): true | { where: { id: { in: string[] } } } {
  if (assignedLinks === undefined) {
    return true;
  }

  return {
    where: {
      id: {
        in: assignedLinks.map(({ id }) => id),
      },
    },
  };
}
