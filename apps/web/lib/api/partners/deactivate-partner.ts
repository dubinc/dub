import { Session } from "@/lib/auth";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { executePartnerDeactivation } from "./bulk-deactivate-partners";
import { DubApiError } from "../errors";
import { getProgramEnrollmentOrThrow } from "../programs/get-program-enrollment-or-throw";

interface DeactivatePartnerParams {
  workspaceId: string;
  programId: string;
  partnerId: string;
  user?: Session["user"];
}

// Deactivate a partner in a program
export async function deactivatePartner({
  workspaceId,
  programId,
  partnerId,
  user,
}: DeactivatePartnerParams) {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    programId,
    partnerId,
    include: {
      partner: true,
    },
  });

  if (
    !ACTIVE_ENROLLMENT_STATUSES.includes(
      programEnrollment.status as (typeof ACTIVE_ENROLLMENT_STATUSES)[number],
    )
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `Only partners with an "approved" or "archived" status can be deactivated. The partner's status in this program is "${programEnrollment.status}".`,
    });
  }

  const { partner } = programEnrollment;

  await executePartnerDeactivation({
    workspaceId,
    programId,
    partners: [
      {
        id: partner.id,
        name: partner.name,
        email: partner.email,
      },
    ],
    user,
  });
}
