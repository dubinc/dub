"use server";

import { banPartner } from "@/lib/api/partners/ban-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { banPartnerSchema } from "@/lib/zod/schemas/partners";
import { authActionClient } from "../safe-action";

// Ban a partner
export const banPartnerAction = authActionClient
  .schema(banPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      includePartner: true,
    });

    if (programEnrollment.status === "banned") {
      throw new Error("This partner is already banned.");
    }

    await banPartner({
      workspace,
      program: programEnrollment.program,
      partner: programEnrollment.partner,
      reason: parsedInput.reason,
      user,
      notifyPartner: true,
    });
  });
