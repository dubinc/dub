"use server";

import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  filterValidatedTooltipSuggestions,
  stripRewardTooltipMarkdown,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { CONDITION_OPERATOR_LABELS } from "@/lib/zod/schemas/rewards";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";
import {
  reviewRewardTooltipInputSchema,
  reviewRewardTooltipOutputSchema,
  type ReviewRewardTooltipModifier,
  type TooltipSuggestion,
} from "./review-reward-tooltip-schema";

export async function reviewRewardTooltipConsistency(
  input: unknown,
): Promise<{ suggestions: TooltipSuggestion[] }> {
  try {
    const parsedInput = reviewRewardTooltipInputSchema.safeParse(input);
    if (!parsedInput.success) {
      return { suggestions: [] };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { suggestions: [] };
    }

    const workspaceId = normalizeWorkspaceId(parsedInput.data.workspaceId);
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
      return { suggestions: [] };
    }

    throwIfNoPermission({
      role: workspace.users[0].role,
      requiredRoles: ["owner", "member"],
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.aiRewardTooltipReview,
      identifier: [session.user.id, workspaceId],
    });

    const tooltip = stripRewardTooltipMarkdown(parsedInput.data.tooltip);
    if (!tooltip) {
      return { suggestions: [] };
    }

    const { event, modifiers } = parsedInput.data;

    const { output } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      output: Output.object({
        schema: reviewRewardTooltipOutputSchema,
      }),
      system: buildSystemPrompt(event),
      prompt: buildUserPrompt({ tooltip, modifiers }),
      temperature: 0,
      maxOutputTokens: 600,
    });

    const parsedOutput = reviewRewardTooltipOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
      return { suggestions: [] };
    }

    return {
      suggestions: filterValidatedTooltipSuggestions({
        event,
        modifiers,
        suggestions: parsedOutput.data.suggestions,
      }),
    };
  } catch (error) {
    console.error("[reviewRewardTooltipConsistency]", error);
    return { suggestions: [] };
  }
}

function buildSystemPrompt(event: string) {
  return `You review whether partner-facing reward tooltip copy contradicts the structured reward conditions.

Event type: ${event}

Rules:
- Compare meaning, not wording. The tooltip is marketing copy; the conditions are the eligibility rules.
- Only flag an EXISTING condition that a partner who only read the tooltip would find surprising.
- Do not flag extra conditions the tooltip never mentioned.
- Do not invent new condition rows. Do not change entity or attribute.
- A suggestion may change operator and/or value only.
- If you are not sure, return an empty suggestions array. Never guess.
- confidence is 0–1. Use below 0.5 when the reading is ambiguous or only loosely implied.
- reason must be one short sentence a program manager can understand.
- Use the human operator labels (e.g. "is greater than"), never raw IDs like greater_than or field paths like sale.amount.
- Wrap the tooltip phrase and the conflicting condition wording in double quotes.
- Do not explain inclusive/exclusive in parentheses. Say what a partner would expect vs what the condition does.

Good reason: "Minimum $20 deposit" implies $20 qualifies, but "is greater than" excludes it.
Bad reason: Tooltip says "min $20" (at least $20, inclusive) but the condition uses greater_than 20 (excludes $20).

Examples of contradictions:
- Tooltip says "minimum $20" / "at least $20" but the condition is "is greater than" $20 (excludes $20).
- Tooltip says "more than $20" / "over $20" but the condition is "is greater than or equal to" $20.

Not contradictions:
- Tooltip is shorter than the config or omits extra filters (country, product, metadata).
- Informal wording that does not clearly specify a different operator or threshold.`;
}

function buildUserPrompt({
  tooltip,
  modifiers,
}: {
  tooltip: string;
  modifiers: ReviewRewardTooltipModifier[];
}) {
  const serialized = modifiers
    .map((modifier, modifierIndex) => {
      const conditions = modifier.conditions
        .map((condition, conditionIndex) => {
          const operatorLabel =
            CONDITION_OPERATOR_LABELS[condition.operator] ?? condition.operator;
          const value = Array.isArray(condition.value)
            ? condition.value.join(", ")
            : String(condition.value);
          const field = condition.metadataField
            ? `${condition.entity}.${condition.attribute}.${condition.metadataField}`
            : `${condition.entity}.${condition.attribute}`;

          return `  [${modifierIndex}][${conditionIndex}] ${field} ${condition.operator} (${operatorLabel}) ${value}`;
        })
        .join("\n");

      return `Group ${modifierIndex} (${modifier.operator}):\n${conditions}`;
    })
    .join("\n");

  return `Tooltip:
"""
${tooltip}
"""

Conditions:
${serialized}

Write the reason for a non-technical user. Use the operator labels in parentheses, not the raw operator keys.`;
}
