import { createId } from "@/lib/api/create-id";
import { CONFIGURABLE_FRAUD_RULES } from "@/lib/api/fraud/constants";
import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { FraudRuleType, Prisma } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/fraud/rules
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

      // Default paidTrafficDetected to enabled with Google platform
      if (type === "paidTrafficDetected" && !fraudRule) {
        return {
          type,
          enabled: true,
          config: { platforms: ["google"] },
        };
      }

      return {
        type,
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

// PATCH /api/fraud/rules - update fraud rules for a program
export const PATCH = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { referralSourceBanned, paidTrafficDetected } =
      updateFraudRuleSettingsSchema.parse(await parseRequestBody(req));

    const rulesToUpdate = [
      {
        type: "referralSourceBanned" as FraudRuleType,
        payload: referralSourceBanned,
      },
      {
        type: "paidTrafficDetected" as FraudRuleType,
        payload: paidTrafficDetected,
      },
    ].filter((r) => r.payload);

    for (const { type, payload } of rulesToUpdate) {
      if (!payload) continue;

      await prisma.fraudRule.upsert({
        where: {
          programId_type: {
            programId,
            type,
          },
        },
        create: {
          id: createId({ prefix: "fr_" }),
          programId,
          type,
          config: payload.config ?? Prisma.DbNull,
          disabledAt: payload.enabled ? null : new Date(),
        },
        update: {
          config: payload.config ?? Prisma.DbNull,
          disabledAt: payload.enabled ? null : new Date(),
        },
      });
    }

    waitUntil(
      (async () => {
        const ruleTypesToResolve = rulesToUpdate
          .filter(
            (r) =>
              r.payload?.enabled === false &&
              r.payload?.resolvePendingEvents === true,
          )
          .map((r) => r.type);

        if (ruleTypesToResolve.length > 0) {
          await resolveFraudGroups({
            where: {
              programId,
              type: {
                in: ruleTypesToResolve,
              },
            },
            userId: session.user.id,
            resolutionReason:
              "Resolved automatically because the fraud rule was disabled.",
          });
        }
      })(),
    );

    return NextResponse.json({ success: true });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
