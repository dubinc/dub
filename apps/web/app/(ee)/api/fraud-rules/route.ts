import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getMergedFraudRules } from "@/lib/fraud/get-merged-fraud-rules";
import {
  fraudRuleSchema,
  updateFraudRulesSchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud-rules - get all fraud rules for a program
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const programRules = await prisma.fraudRule.findMany({
      where: {
        programId,
      },
    });

    const mergedRules = getMergedFraudRules(programRules);

    return NextResponse.json(z.array(fraudRuleSchema).parse(mergedRules));
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// PATCH /api/fraud-rules - update fraud rules for a program
export const PATCH = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { rules } = updateFraudRulesSchema.parse(await parseRequestBody(req));

    // Update or create each rule
    await prisma.$transaction(
      rules.map((rule) =>
        prisma.fraudRule.upsert({
          where: {
            programId_type: {
              programId,
              type: rule.type,
            },
          },
          create: {
            programId,
            type: rule.type,
            disabledAt: rule.enabled ? null : new Date(),
          },
          update: {
            disabledAt: rule.enabled ? null : new Date(),
          },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
