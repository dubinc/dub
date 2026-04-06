/**
 * Prisma `where` fragment for filtering by linkId.
 * Use in direct queries: where: { ...linkScopeFilter(assignedLinkIds) }
 */
export function linkScopeFilter(assignedLinkIds: string[] | undefined): {
  linkId?: { in: string[] };
} {
  if (assignedLinkIds === undefined) {
    return {};
  }

  return {
    linkId: {
      in: assignedLinkIds,
    },
  };
}

/**
 * Prisma `include.links` value for getProgramEnrollmentOrThrow calls.
 * Returns `true` (all links) or `{ where: { id: { in: ... } } }` (scoped).
 */
export function linkIncludeFilter(
  assignedLinkIds: string[] | undefined,
): true | { where: { id: { in: string[] } } } {
  if (assignedLinkIds === undefined) {
    return true;
  }

  return {
    where: {
      id: {
        in: assignedLinkIds,
      },
    },
  };
}
