import { prisma } from "@dub/prisma";
import { z } from "zod";
import { defineFraudRule } from "../define-fraud-rule";

const contextSchema = z.object({
  program: z.object({
    id: z.string(),
  }),
  partner: z.object({
    id: z.string(),
  }),
});

export const checkCrossProgramBan = defineFraudRule({
  type: "partnerCrossProgramBan",
  contextSchema,
  evaluate: async (context) => {
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
