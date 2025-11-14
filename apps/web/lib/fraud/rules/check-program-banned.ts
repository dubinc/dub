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

export const checkProgramBanned = defineFraudRule({
  type: "programBanned",
  contextSchema,
  evaluate: async (context) => {
    console.log("Evaluating checkProgramBanned...", context);

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
