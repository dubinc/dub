import { prisma } from "@/lib/prisma";

export async function checkLinkEnrollmentAvailability({
  linkId,
}: {
  linkId: string;
}) {
  const [linkInProgramEnrollment, linkInProgramInvite] = await Promise.all([
    prisma.programEnrollment.findUnique({
      where: {
        linkId,
      },
    }),
    prisma.programInvite.findUnique({
      where: {
        linkId,
      },
    }),
  ]);

  if (linkInProgramEnrollment || linkInProgramInvite)
    throw new Error("Link is already associated with another partner.");

  return true;
}
