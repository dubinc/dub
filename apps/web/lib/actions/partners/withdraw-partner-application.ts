"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const inputSchema = z.object({
  programId: z.string(),
});

export const withdrawPartnerApplicationAction = authPartnerActionClient
  .inputSchema(inputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { programId } = parsedInput;
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "program_enrollments.withdraw",
    });

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {},
    });

    if (programEnrollment.status !== "pending") {
      throw new Error(
        "You can only withdraw your application if it's still pending.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const deletedProgramEnrollment = await tx.programEnrollment.delete({
        where: {
          id: programEnrollment.id,
        },
      });

      if (programEnrollment.applicationId) {
        await tx.programApplication.delete({
          where: {
            id: programEnrollment.applicationId,
          },
        });
      }

      return deletedProgramEnrollment;
    });
  });
