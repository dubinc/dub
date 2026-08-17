"use server";

import {
  refundAIUsageCredit,
  reserveAIUsageCredit,
} from "@/lib/api/links/usage-checks";
import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { getSession } from "@/lib/auth";
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
import {
  AI_REWARD_EVENTS,
  AIRewardGenerationOutput,
  getAIRewardGenerationSchema,
  getAIRewardSchema,
} from "./ai-reward-schema";

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
- Only use entities and attributes allowed for this event (listed below). Use attribute ids exactly as listed — never invent names (e.g. use signupDate for when a customer joined, not createdAt).

Unsupported requests (important):
- Set supported=false when the request cannot be expressed accurately with the allowed attributes. Set reward to null and explain briefly in reason.
- Do NOT approximate, stretch meanings, or substitute a "close enough" attribute.
- Examples of unsupported: billing interval / plan cadence (yearly vs monthly plans), plan names or tiers not identified via productId or an explicitly named metadata field, or any condition on a field not listed below.
- customer.subscriptionDurationMonths is how long the customer has already been subscribed — it is NOT whether their plan is billed yearly or monthly.
- When supported=true, provide a complete reward object. When supported=false, reward must be null.

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

    const fail = async (cause?: unknown) => {
      if (failed) return;
      failed = true;
      if (cause != null) {
        console.error("[generateReward] failed", cause);
      }
      await refundAIUsageCredit(workspaceId).catch((e) =>
        console.error("Failed to refund AI credit", e),
      );
      stream.error(new Error("Failed to generate reward. Please try again."));
    };

    try {
      const generationSchema = getAIRewardGenerationSchema(event);
      const result = streamText({
        model: anthropic("claude-sonnet-4-6"),
        output: Output.object({ schema: generationSchema }),
        system: buildSystemPrompt(event),
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
        onError: ({ error }) => {
          void fail(error);
        },
      });

      let lastPartial: Partial<AIRewardGenerationOutput> | null = null;
      for await (const partialObject of result.partialOutputStream) {
        if (failed) return;
        if (partialObject) {
          lastPartial = partialObject as Partial<AIRewardGenerationOutput>;
          stream.update(lastPartial);
        }
      }

      if (failed) return;

      if (!lastPartial) {
        try {
          const text = await result.text;
          if (text) {
            lastPartial = JSON.parse(text) as Partial<AIRewardGenerationOutput>;
          }
        } catch (error) {
          let text: string | null = null;
          let finishReason: string | null = null;
          try {
            text = await result.text;
          } catch {
            // ignore
          }
          try {
            finishReason = await result.finishReason;
          } catch {
            // ignore
          }
          await fail({
            reason: "empty_generation_output",
            error,
            text,
            finishReason,
          });
          return;
        }
      }

      const parsed = generationSchema.safeParse(lastPartial);
      if (!parsed.success) {
        await fail({
          reason: "invalid_generation_output",
          lastPartial,
          issues: parsed.error.issues,
        });
        return;
      }

      if (parsed.data.supported) {
        const rewardParsed = getAIRewardSchema(event).safeParse(
          parsed.data.reward,
        );
        if (!rewardParsed.success) {
          console.error("[generateReward] invalid reward draft", {
            lastPartial: parsed.data,
            issues: rewardParsed.error.issues,
          });

          const unsupported: AIRewardGenerationOutput = {
            supported: false,
            reason:
              "Could not map this request to supported reward conditions.",
            reward: null,
          };
          stream.update(unsupported);
          stream.done();
          return;
        }
      }

      stream.done();
    } catch (error) {
      await fail(error);
    }
  })();

  return { object: stream.value };
}
