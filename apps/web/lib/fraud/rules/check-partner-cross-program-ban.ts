import { prisma } from "@dub/prisma";
import { defineFraudRule } from "../define-fraud-rule";
import { FraudPartnerContext } from "../types";

export const checkCrossProgramBan = defineFraudRule({
  type: "partnerCrossProgramBan",
  evaluate: async ({ program, partner }: FraudPartnerContext) => {
    console.log("Evaluating checkProgramBanned...");

    if (!program) {
      return {
        triggered: false,
      };
    }

    const bannedProgramEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        partnerId: partner.id,
        programId: {
          not: program.id,
        },
        status: "banned",
      },
    });

    return {
      triggered: bannedProgramEnrollment ? true : false,
    };
  },
});
