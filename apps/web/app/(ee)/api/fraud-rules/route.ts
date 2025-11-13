import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { FRAUD_RULES } from "@/lib/fraud/constants";
import { getFraudRules } from "@/lib/fraud/fraud-rules-registry";
import { updateFraudRulesSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
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

    // Merge global rules with program overrides
    // TODO:
    // Reuse the logic from detectAndRecordFraudEvent
    const rulesWithInfo = FRAUD_RULES.map((ruleInfo) => {
      const globalRule = getFraudRules().find(
        (gr) => gr.type === ruleInfo.type,
      );

      const programRule = programRules.find((pr) => pr.type === ruleInfo.type);

      return {
        id: programRule?.id,
        type: ruleInfo.type,
        name: ruleInfo.name,
        riskLevel: ruleInfo.riskLevel,
        description: ruleInfo.description,
        enabled: programRule ? programRule.disabledAt === null : true,
        config: programRule?.config ?? globalRule?.config ?? null,
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

    // Validate all rule types exist in FRAUD_RULES
    const validTypes = new Set(FRAUD_RULES.map((r) => r.type));
    for (const rule of rules) {
      if (!validTypes.has(rule.type as FraudRuleType)) {
        throw new DubApiError({
          code: "bad_request",
          message: `Invalid fraud rule type: ${rule.type}`,
        });
      }
    }

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
