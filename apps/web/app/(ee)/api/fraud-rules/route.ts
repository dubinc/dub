import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { FRAUD_RULES } from "@/lib/fraud/constants";
import { mergeFraudRulesWithProgramOverrides } from "@/lib/fraud/merge-fraud-rules";
import { updateFraudRulesSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/fraud-rules - get all fraud rules for a program
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const programRules = await prisma.fraudRule.findMany({
      where: {
        programId,
      },
    });

    const mergedRules = mergeFraudRulesWithProgramOverrides(programRules);

    // Add UI-specific fields (name, description) from FRAUD_RULES
    const rulesWithInfo = mergedRules.map((mergedRule) => {
      const ruleInfo = FRAUD_RULES.find((r) => r.type === mergedRule.type);

      return {
        id: mergedRule.id,
        type: mergedRule.type,
        name: ruleInfo?.name ?? mergedRule.type,
        riskLevel: mergedRule.riskLevel,
        description: ruleInfo?.description ?? "",
        enabled: mergedRule.enabled,
        config: mergedRule.config,
      };
    });

    return NextResponse.json(rulesWithInfo);
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
