import { prisma } from "@dub/prisma";

interface UpdateProgramApplicationEventInput {
  event: "submitted" | "approved" | "rejected";
  programId: string;
  partnerId: string;
  applicationId?: string | null;
}

export async function updateProgramApplicationEvent({
  event,
  programId,
  partnerId,
  applicationId,
}: UpdateProgramApplicationEventInput): Promise<void> {
  const eventToColumnMap = {
    submitted: "submittedAt",
    approved: "approvedAt",
    rejected: "rejectedAt",
  } as const;

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
        ...(applicationId && { programApplicationId: applicationId }),
      },
    });
  } catch (error) {
    //
  }
}
