import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getWorkspaceId } from "@/lib/api/workspace-id";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import z from "@/lib/zod";
import { anthropic } from "@ai-sdk/anthropic";
import { prismaEdge } from "@dub/prisma/edge";
import { waitUntil } from "@vercel/functions";
import { streamText } from "ai";

export const runtime = "edge";

const completionSchema = z.object({
  prompt: z.string(),
  model: z
    .enum(["claude-3-haiku-20240307", "claude-3-5-sonnet-latest"])
    .optional()
    .default("claude-3-5-sonnet-latest"),
});

// POST /api/ai/completion – Generate AI completion
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    try {
      const {
        // comment for better diff
        prompt,
        model,
      } = completionSchema.parse(await req.json());

      const result = streamText({
        model: anthropic(model),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        maxTokens: 300,
      });
      // only count usage for the sonnet model
      if (model === "claude-3-5-sonnet-latest") {
        waitUntil(
          prismaEdge.project.update({
            where: {
              id: getWorkspaceId(workspace.id),
            },
            data: {
              aiUsage: {
                increment: 1,
              },
            },
          }),
        );
      }

      return result.toDataStreamResponse();
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  { needNotExceededAI: true },
);
