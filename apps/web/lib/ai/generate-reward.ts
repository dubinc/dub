"use server";

import {
  refundAIUsageCredit,
  reserveAIUsageCredit,
} from "@/lib/api/links/usage-checks";
import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { getSession } from "@/lib/auth";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { PlanProps } from "@/lib/types";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { REWARD_CONDITIONS } from "@/lib/zod/schemas/rewards";
import { anthropic } from "@ai-sdk/anthropic";
import { createStreamableValue } from "@ai-sdk/rsc";
import { Output, streamText } from "ai";
import * as z from "zod/v4";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import { AIRewardDraft, getAIRewardSchema } from "./ai-reward-schema";

const AI_REWARD_EVENTS = ["click", "lead", "sale"] as const;

const inputSchema = z.object({
  workspaceId: z.string(),
  event: z.enum(AI_REWARD_EVENTS),
  prompt: z.string().min(1).max(2000),
});

function buildSystemPrompt(event: (typeof AI_REWARD_EVENTS)[number]) {
  const entities = REWARD_CONDITIONS[event].entities.map((entity) => {
    const attrs = entity.attributes
      .map((attr) => {
        const options = attr.options
          ? ` options=[${attr.options.map((o) => `${o.id}`).join(", ")}]`
          : "";
        return `    - ${attr.id} (${attr.type}${options})`;
      })
      .join("\n");
    return `  - ${entity.id}:\n${attrs}`;
  });

  return `You are a partner reward structure assistant for Dub. Convert the user's natural-language reward idea into a structured reward configuration.

Event type: ${event}

Rules:
- Output only fields that are clearly requested or strongly implied.
- Flat amounts are in dollars (not cents). Percentage amounts are 0–100. Decimals are allowed for both.
- Currency condition values (sale.amount, partner.totalSaleAmount, partner.totalCommissions) are in dollars.
- Date condition values (e.g. signupDate, subscriptionStartDate) use ISO 8601 strings (e.g. 2024-01-15).
- Country values use ISO 3166-1 alpha-2 codes (e.g. US, GB).
- Condition groups (modifiers) override the base reward when their conditions match. Make sure to set the most generic condition as the base condition.
- If the user describes only a simple base reward with no conditions, omit modifiers or return an empty array.
- Do not invent metadata fields unless the user names them; when using metadata, set metadataField.
- Only use entities and attributes allowed for this event (listed below).

Allowed entities and attributes for ${event}:
${entities.join("\n")}`;
}

export async function generateReward(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid request.");
  }

  const { event, prompt } = parsed.data;

  const session = await getSession();
  if (!session?.user.id) {
    throw new Error("Unauthorized: Login required.");
  }

  const workspaceId = normalizeWorkspaceId(parsed.data.workspaceId);

  const workspace = await prisma.project.findUnique({
    where: { id: workspaceId },
    include: {
      users: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!workspace?.users?.length) {
    throw new Error("Workspace not found.");
  }

  const role = workspace.users[0].role;
  throwIfNoPermission({
    role,
    requiredRoles: ["owner", "member"],
  });

  const { canUseAdvancedRewardLogic } = getPlanCapabilities(
    workspace.plan as PlanProps,
  );
  if (!canUseAdvancedRewardLogic) {
    throw new Error(
      "AI reward builder is only available on the Advanced plan and above.",
    );
  }

  await assertRateLimit({
    policy: RATELIMIT_POLICIES.aiRewardGenerate,
    identifier: [session.user.id, workspaceId],
  });

  await reserveAIUsageCredit({
    id: workspace.id,
    aiLimit: workspace.aiLimit,
    plan: workspace.plan as PlanProps,
    planPeriod: workspace.planPeriod,
  });

  const stream = createStreamableValue();

  (async () => {
    let failed = false;

    const fail = async () => {
      if (failed) return;
      failed = true;
      await refundAIUsageCredit(workspaceId).catch((e) =>
        console.error("Failed to refund AI credit", e),
      );
      stream.error(new Error("Failed to generate reward. Please try again."));
    };

    try {
      const rewardSchema = getAIRewardSchema(event);
      const { partialOutputStream } = streamText({
        model: anthropic("claude-sonnet-4-6"),
        output: Output.object({ schema: rewardSchema }),
        system: buildSystemPrompt(event),
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
        onError: () => {
          void fail();
        },
      });

      let lastPartial: Partial<AIRewardDraft> | null = null;
      for await (const partialObject of partialOutputStream) {
        if (failed) return;
        if (partialObject) {
          lastPartial = partialObject as Partial<AIRewardDraft>;
          stream.update(lastPartial);
        }
      }

      if (failed) return;

      if (!lastPartial || !rewardSchema.safeParse(lastPartial).success) {
        await fail();
        return;
      }

      stream.done();
    } catch {
      await fail();
    }
  })();

  return { object: stream.value };
}
