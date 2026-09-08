import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { queueDomainUpdate } from "./queue-domain-update";

export async function updateProgramDomain({
  programId,
  oldDomain,
  newDomain,
}: {
  programId: string;
  oldDomain: string | null;
  newDomain: string;
}) {
  await prisma.$transaction([
    prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        domain: newDomain,
      },
    }),
    prisma.partnerGroupDefaultLink.updateMany({
      where: {
        programId,
      },
      data: {
        domain: newDomain,
      },
    }),
  ]);

  if (oldDomain && oldDomain !== newDomain) {
    waitUntil(
      queueDomainUpdate({
        oldDomain,
        newDomain,
        programId,
      }),
    );
  }
}
