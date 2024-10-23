import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@dub/prisma/edge";
import z from "@/lib/zod";
import { anthropic } from "@ai-sdk/anthropic";
import { waitUntil } from "@vercel/functions";
import { streamText } from "ai";

export const runtime = "edge";

const completionSchema = z.object({
  prompt: z.string(),
  model: z
    .enum(["claude-3-haiku-20240307", "claude-3-sonnet-20240229"])
    .optional()
    .default("claude-3-sonnet-20240229"),
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

      const result = await streamText({
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
      if (model === "claude-3-sonnet-20240229") {
        waitUntil(
          prismaEdge.project.update({
            where: { id: workspace.id.replace("ws_", "") },
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
