import {
  getWorkspaceViaEdge,
  incrementWorkspaceAIUsage,
} from "@/lib/planetscale";
import { getSearchParams } from "@dub/utils";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

// POST /api/ai/metatags – Generate metatags for a URL using AI
export async function POST(req: NextRequest) {
  const searchParams = getSearchParams(req.url);
  const { workspaceId } = searchParams;
  const workspace = await getWorkspaceViaEdge(workspaceId);

  if (!workspace) {
    return new Response("Workspace not found", { status: 404 });
  }

  if (workspace.aiUsage > workspace.aiLimit) {
    return new Response(
      "Exceeded AI usage limit. Upgrade to a higher plan to get more AI credits.",
      { status: 429 },
    );
  }

  try {
    const { prompt } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are an SEO expert that specializes in creating SEO-optimized meta title & description tags. You receive a question like 'What is a suitable, new meta-title for Dub?' and you respond with a plain text answer, no quotes, no special characters, nothing other than the tag that you're generating. Try to keep it short and sweet.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
      top_p: 1,
      frequency_penalty: 2,
      presence_penalty: 2,
    });

    const stream = OpenAIStream(response);

    waitUntil(async () => await incrementWorkspaceAIUsage(workspaceId));

    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
