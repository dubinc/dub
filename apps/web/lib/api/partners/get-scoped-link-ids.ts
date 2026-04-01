import { prisma } from "@dub/prisma";

/**
 * For non-owner users on [programId] routes, determine which links they can access.
 *
 * Returns:
 * - `undefined` if the user has no program/link assignments (unrestricted access)
 * - `string[]` of allowed link IDs if the user is scoped
 *
 * The logic:
 * 1. Check if the user has ANY PartnerUserProgram records (i.e. is scoped at all)
 * 2. If not scoped → return undefined (see everything)
 * 3. If scoped but doesn't have this program assigned → return [] (see nothing)
 * 4. If scoped and has this program → check PartnerUserLink records:
 *    - If link records exist → return those link IDs
 *    - If no link records → return undefined (see all links in this program)
 */
export async function getScopedLinkIds({
  partnerUserId,
  programId,
}: {
  partnerUserId: string;
  programId: string;
}): Promise<string[] | undefined> {
  // Check if user has any program-level scoping at all
  const programAssignmentCount = await prisma.partnerUserProgram.count({
    where: {
      partnerUserId,
    },
  });

  // No program assignments → unrestricted access
  if (programAssignmentCount === 0) {
    return undefined;
  }

  // User is scoped — check if they have access to this specific program
  const hasProgramAccess = await prisma.partnerUserProgram.findUnique({
    where: {
      partnerUserId_programId: {
        partnerUserId,
        programId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!hasProgramAccess) {
    // Scoped but doesn't have this program → no access
    return [];
  }

  // Has program access — check for link-level scoping
  const linkAssignments = await prisma.partnerUserLink.findMany({
    where: {
      partnerUserId,
      programId,
    },
    select: {
      linkId: true,
    },
  });

  // No link assignments → see all links in this program
  if (linkAssignments.length === 0) {
    return undefined;
  }

  // Has link assignments → restricted to those links
  return linkAssignments.map((a) => a.linkId);
}
