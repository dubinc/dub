import { Session } from "@/lib/auth";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { processPartnerDeactivation } from "./process-partner-deactivation";

interface BulkDeactivatePartnersParams {
  workspaceId: string;
  programId: string;
  partnerIds: string[];
  user?: Session["user"];
  programDeactivated?: boolean; // Indicate if the entire program is being deactivated
}

export async function bulkDeactivatePartners({
  workspaceId,
  programId,
  partnerIds,
  user,
  programDeactivated = false,
}: BulkDeactivatePartnersParams) {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: partnerIds,
      },
      programId,
      status: {
        in: ACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (programEnrollments.length === 0) {
    console.log(
      "[bulkDeactivatePartners] No program enrollments found to deactivate.",
      {
        programId,
      },
    );
    return;
  }

  const partners = programEnrollments.map(({ partner }) => partner);

  await processPartnerDeactivation({
    workspaceId,
    programId,
    partners,
    user,
    programDeactivated,
  });
}
