import { anthropic } from "@/lib/anthropic";
import {
  getWorkspaceViaEdge,
  incrementWorkspaceAIUsage,
} from "@/lib/planetscale";
import { getSearchParams } from "@dub/utils";
import { AnthropicStream, StreamingTextResponse } from "ai";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextRequest } from "next/server";

export const runtime = "edge";

// POST /api/ai/completion – Generate AI completion
export async function POST(req: NextRequest) {
  const searchParams = getSearchParams(req.url);
  const { workspaceId } = searchParams;
  const workspace = await getWorkspaceViaEdge(workspaceId);

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
    const { prompt } = await req.json();

    const response = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "claude-3-haiku-20240307",
      stream: true,
      max_tokens: 300,
    });

    const stream = AnthropicStream(response);

    waitUntil(async () => await incrementWorkspaceAIUsage(workspaceId));

    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
