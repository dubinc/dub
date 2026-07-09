import { Prisma } from "@prisma/client";

/**
 * Prisma `where` input for partners reachable by a program: approved/trusted
 * in the partner network, enrolled in the program, or already has a message
 * thread with the program. Spread into a `prisma.partner` query alongside an
 * `id` filter; callers are still responsible for action-specific authorization.
 */
export const partnerReachableByProgramWhereInput = (
  programId: string,
): Prisma.PartnerWhereInput => ({
  OR: [
    { networkStatus: { in: ["approved", "trusted"] } },
    { programs: { some: { programId } } },
    { messages: { some: { programId } } },
  ],
});
