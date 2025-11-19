import { getMergedFraudRules } from "@/lib/api/fraud/get-merged-fraud-rules";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  fraudRuleSchema,
  updateFraudRuleSettingsSchema,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud-rules
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const fraudRules = await prisma.fraudRule.findMany({
      where: {
        programId,
      },
    });

    const mergedRules = getMergedFraudRules(fraudRules);

    return NextResponse.json(z.array(fraudRuleSchema).parse(mergedRules));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// PATCH /api/fraud-rules - update fraud rules for a program
export const PATCH = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { rules } = updateFraudRuleSettingsSchema.parse(
      await parseRequestBody(req),
    );

    // Update or create each rule
    // TODO

    return NextResponse.json({ success: true });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
