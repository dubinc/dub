import { CONFIGURABLE_FRAUD_RULES } from "@/lib/api/fraud/constants";
import { createFraudEventGroupKey } from "@/lib/api/fraud/utils";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updateFraudRuleSettingsSchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { FraudRuleType, Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
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

// PATCH /api/fraud-rules - update fraud rules for a program
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
          programId,
          type,
          config: payload.config ?? Prisma.DbNull,
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
          .filter((r) => r.payload?.enabled === true)
          .map((r) => r.type);

        if (ruleTypesToResolve.length > 0) {
          // Fetch fraud events grouped by their existing groupKey
          const fraudEvents = await prisma.fraudEvent.findMany({
            where: {
              programId,
              status: "pending",
              type: {
                in: ruleTypesToResolve,
              },
            },
            select: {
              id: true,
              groupKey: true,
              partnerId: true,
              type: true,
            },
          });

          // Group events by their existing groupKey
          const groupedEvents = new Map<string, typeof fraudEvents>();

          for (const event of fraudEvents) {
            if (!groupedEvents.has(event.groupKey)) {
              groupedEvents.set(event.groupKey, []);
            }

            groupedEvents.get(event.groupKey)!.push(event);
          }

          // Update each group with a new groupKey
          for (const [groupKey, events] of groupedEvents) {
            if (events.length === 0) continue;

            const firstEvent = events[0];
            const newGroupKey = createFraudEventGroupKey({
              programId,
              partnerId: firstEvent.partnerId,
              type: firstEvent.type,
              batchId: nanoid(10),
            });

            await prisma.fraudEvent.updateMany({
              where: {
                groupKey,
                status: "pending",
              },
              data: {
                status: "resolved",
                userId: session.user.id,
                resolvedAt: new Date(),
                resolutionReason:
                  "Resolved automatically because the fraud rule was disabled.",
                groupKey: newGroupKey,
              },
            });
          }
        }
      })(),
    );

    return NextResponse.json({ success: true });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
