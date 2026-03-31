import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { throwIfAIUsageExceeded } from "@/lib/api/links/usage-checks";
import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { anthropic } from "@ai-sdk/anthropic";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { streamText } from "ai";
import * as z from "zod/v4";

const completionSchema = z.object({
  prompt: z.string(),
  model: z
    .enum(["claude-3-5-haiku-latest", "claude-sonnet-4-20250514"])
    .optional()
    .default("claude-sonnet-4-20250514"),
});

// POST /api/ai/completion – Generate AI completion
export const POST = withWorkspace(async ({ req, workspace }) => {
  try {
    const {
      // comment for better diff
      prompt,
      model,
    } = completionSchema.parse(await req.json());

    throwIfAIUsageExceeded(workspace);

    const result = streamText({
      model: anthropic(model),
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      maxOutputTokens: 300,
    });

    // only count usage for the sonnet model
    if (model === "claude-sonnet-4-20250514") {
      waitUntil(
        prisma.project.update({
          where: { id: normalizeWorkspaceId(workspace.id) },
          data: {
            aiUsage: {
              increment: 1,
            },
          },
        }),
      );
    }

    return result.toTextStreamResponse();
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
