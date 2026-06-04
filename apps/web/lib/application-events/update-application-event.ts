import { prisma } from "@dub/prisma";
import { PartnerNetworkStatus, Prisma } from "@dub/prisma/client";
import { cookies } from "next/headers";
import { getApplicationEventCookieName } from "./utils";

// Application events visited as a guest have partnerId: null — look up the
// event via the browser cookie and backfill partnerId + submittedAt.
// Fallback to the (programId, partnerId) lookup if no cookie is present (e.g. the
// partner visited while already logged in on a different browser).
export async function markApplicationEventSubmitted(
  programEnrollment: Pick<
    Prisma.ProgramEnrollmentCreateManyInput,
    "programId" | "partnerId" | "applicationId"
  >,
  { partnerNetworkStatus }: { partnerNetworkStatus: PartnerNetworkStatus },
) {
  const { programId, partnerId, applicationId } = programEnrollment;
  const cookieStore = await cookies();
  const cookieName = getApplicationEventCookieName(programId);
  const applicationEventId = cookieStore.get(cookieName)?.value;
  if (!applicationEventId && !partnerId) {
    console.error(
      "[markApplicationEventSubmitted]: No application event ID or partner ID provided, skipping...",
    );
    return;
  }

  const applicationEvent = await prisma.programApplicationEvent.findUnique({
    where: {
      ...(applicationEventId
        ? { id: applicationEventId }
        : { programId_partnerId: { programId, partnerId } }),
    },
  });

  if (!applicationEvent) {
    console.error(
      "[markApplicationEventSubmitted]: No application event found, skipping...",
    );
    return;
  }

  try {
    await prisma.programApplicationEvent.update({
      where: {
        id: applicationEvent.id,
      },
      data: {
        submittedAt: new Date(),
        partnerId,
        programApplicationId: applicationId,
        ...(applicationEvent.referralSource === "marketplace" &&
        !["approved", "trusted"].includes(partnerNetworkStatus)
          ? {
              referralSource: "direct",
            }
          : {}),
      },
    });
  } catch (error) {
    console.error(
      "[markApplicationEventSubmitted]: Error updating application event:",
      error,
    );
  }
}

export async function trackApplicationEvents({
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
