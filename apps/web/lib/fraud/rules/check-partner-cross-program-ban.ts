import { prisma } from "@dub/prisma";
import { defineFraudRule } from "../define-fraud-rule";
import { FraudPartnerContext } from "../types";

export const checkCrossProgramBan = defineFraudRule({
  type: "partnerCrossProgramBan",
  evaluate: async (context: FraudPartnerContext) => {
    console.log("Evaluating checkProgramBanned...");

    const { program, partner } = context;

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
