import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import z from "@/lib/zod";
import { anthropic } from "@ai-sdk/anthropic";
import { StreamingTextResponse, streamText, tool } from "ai";

export const runtime = "edge";

const completionSchema = z.object({
  prompt: z.string(),
});

// POST /api/ai/completion – Generate AI completion
export const POST = withWorkspaceEdge(
  async ({ req }) => {
    try {
      const {
        // comment for better diff
        prompt,
      } = completionSchema.parse(await req.json());

      console.log("prompt", prompt);

      const result = await streamText({
        model: anthropic("claude-3-haiku-20240307"),
        prompt,
        tools: {
          tags: tool({
            description: "Get tags for a worksapce",
            parameters: z.object({
              workspaceId: z
                .string()
                .describe("The workspace id to get tags for"),
            }),
            execute: async ({ workspaceId }) => {
              const tags = await prismaEdge.tag.findMany({
                where: {
                  projectId: workspaceId.replace("ws_", ""),
                },
              });

              console.log("tags", tags);

              return tags.map((tag) => tag.name);
            },
          }),
        },
      });

      return new StreamingTextResponse(result.toAIStream());
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  { needNotExceededAI: true },
);
