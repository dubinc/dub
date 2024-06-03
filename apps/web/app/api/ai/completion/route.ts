import { anthropic } from "@/lib/anthropic";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import z from "@/lib/zod";
import { waitUntil } from "@vercel/functions";
import { AnthropicStream, StreamingTextResponse } from "ai";

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
    if (!anthropic) {
      console.error("Anthropic is not configured. Skipping the request.");
      throw new DubApiError({
        code: "bad_request",
        message: "Anthropic API key is not configured.",
      });
    }

    try {
      const {
        // comment for better diff
        prompt,
        model,
      } = completionSchema.parse(await req.json());

      const response = await anthropic.messages.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model,
        stream: true,
        max_tokens: 300,
      });

      const stream = AnthropicStream(response);

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

      return new StreamingTextResponse(stream);
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  { needNotExceededAI: true },
);
