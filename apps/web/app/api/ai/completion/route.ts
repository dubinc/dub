import { anthropic } from "@/lib/anthropic";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import {
  getWorkspaceViaEdge,
  incrementWorkspaceAIUsage,
} from "@/lib/planetscale";
import z from "@/lib/zod";
import { getSearchParams } from "@dub/utils";
import { AnthropicStream, StreamingTextResponse } from "ai";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextRequest } from "next/server";

export const runtime = "edge";

const completionSchema = z.object({
  prompt: z.string(),
  model: z
    .enum(["claude-3-haiku-20240307", "claude-3-sonnet-20240229"])
    .optional()
    .default("claude-3-sonnet-20240229"),
});

// POST /api/ai/completion – Generate AI completion
export async function POST(req: NextRequest) {
  const searchParams = getSearchParams(req.url);
  const { workspaceId } = searchParams;
  const workspace = await getWorkspaceViaEdge(workspaceId);

  if (!anthropic) {
    console.error("Anthropic is not configured. Skipping the request.");
    return new Response(null, { status: 200 });
  }

  if (!workspace) {
    return new Response("Workspace not found", { status: 404 });
  }

  if (workspace.aiUsage > workspace.aiLimit) {
    return new Response(
      "You've reached your AI usage limit. Upgrade to Pro to get unlimited AI credits.",
      { status: 429 },
    );
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
      waitUntil(async () => await incrementWorkspaceAIUsage(workspaceId));
    }

    return new StreamingTextResponse(stream);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
