import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { groq } from "@/lib/groq";
import {
  getWorkspaceViaEdge,
  incrementWorkspaceAIUsage,
} from "@/lib/planetscale";
import z from "@/lib/zod";
import { getSearchParams } from "@dub/utils";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import { NextRequest } from "next/server";

export const runtime = "edge";

const completionSchema = z.object({
  systemMessage: z.string().default("You are a helpful AI assistant."),
  prompt: z.string(),
  model: z
    .enum(["llama3-8b-8192", "llama3-70b-8192"])
    .optional()
    .default("llama3-70b-8192"),
});

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
    const { systemMessage, prompt, model } = completionSchema.parse(
      await req.json(),
    );

    const response = await groq.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemMessage },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const stream = OpenAIStream(response);

    // only count usage for the 70b model
    if (model === "llama3-70b-8192") {
      waitUntil(async () => await incrementWorkspaceAIUsage(workspaceId));
    }

    return new StreamingTextResponse(stream);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
