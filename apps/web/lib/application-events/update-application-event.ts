import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { cookies } from "next/headers";
import { getApplicationEventCookieName } from "./utils";

// Application events visited as a guest have partnerId: null — look up the
// event via the browser cookie and backfill partnerId + submittedAt. Fall
// back to the (programId, partnerId) lookup if no cookie is present (e.g. the
// partner visited while already logged in on a different browser).
export async function markApplicationEventSubmitted({
  programId,
  partnerId,
  applicationId,
}: Pick<
  Prisma.ProgramEnrollmentCreateManyInput,
  "programId" | "partnerId" | "applicationId"
>) {
  const cookieStore = await cookies();
  const cookieName = getApplicationEventCookieName(programId);
  const eventId = cookieStore.get(cookieName)?.value;

  try {
    await prisma.programApplicationEvent.updateMany({
      where: {
        OR: [
          {
            programId,
            partnerId,
          },
          {
            id: eventId,
          },
        ],
      },
      data: {
        partnerId,
        submittedAt: new Date(),
        programApplicationId: applicationId,
      },
    });
  } catch {}
}

export async function markApplicationEvents({
  programId,
  partnerIds,
  event,
}: {
  programId: string;
  partnerIds: string[];
  event: "approved" | "rejected";
}) {
  if (partnerIds.length === 0) {
    return;
  }

  const eventToColumnMap = {
    approved: "approvedAt",
    rejected: "rejectedAt",
  } as const;

  const column = eventToColumnMap[event];

  if (!column) {
    throw new Error(`Invalid event: ${event}`);
  }

  try {
    await prisma.programApplicationEvent.updateMany({
      where: {
        programId,
        partnerId: {
          in: partnerIds,
        },
        [column]: null,
      },
      data: {
        [column]: new Date(),
      },
    });
  } catch {}
}
