import { prisma } from "@dub/prisma";

interface UpdatelicationEventInput {
  event: "approved" | "rejected";
  programId: string;
  partnerId: string;
}

const eventToColumnMap = {
  approved: "approvedAt",
  rejected: "rejectedAt",
} as const;

export async function updateApplicationEvent({
  event,
  programId,
  partnerId,
}: UpdatelicationEventInput) {
  const column = eventToColumnMap[event];

  if (!column) {
    throw new Error(`Invalid event: ${event}`);
  }

  try {
    await prisma.programApplicationEvent.update({
      where: {
        programId_partnerId: {
          programId,
          partnerId,
        },
        [column]: null,
      },
      data: {
        [column]: new Date(),
      },
    });
  } catch {}
}
