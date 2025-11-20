import { CONFIGURABLE_FRAUD_RULES } from "@/lib/api/fraud/constants";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/fraud-rules
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudRules = await prisma.fraudRule.findMany({
      where: {
        programId,
      },
    });

    const mergedFraudRules = CONFIGURABLE_FRAUD_RULES.map(({ type }) => {
      const fraudRule = fraudRules.find((f) => f.type === type);

      return {
        type: fraudRule?.type,
        enabled: fraudRule?.disabledAt === null,
        config: fraudRule?.config ?? {},
      };
    });

    return NextResponse.json(mergedFraudRules);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// PATCH /api/fraud-rules - update fraud rules for a program
export const PATCH = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { referralSourceBanned, paidTrafficDetected } =
      updateFraudRuleSettingsSchema.parse(await parseRequestBody(req));

    if (referralSourceBanned) {
      await prisma.fraudRule.upsert({
        where: {
          programId_type: {
            programId,
            type: "referralSourceBanned",
          },
        },
        create: {
          programId,
          type: "referralSourceBanned",
          config: referralSourceBanned.config ?? Prisma.DbNull,
        },
        update: {
          config: referralSourceBanned.config ?? Prisma.DbNull,
          disabledAt: referralSourceBanned.enabled ? null : new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
