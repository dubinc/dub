import { getWorkspaceViaEdge } from "@/lib/planetscale";
import { getSearchParams } from "@dub/utils";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

// POST /api/ai/metatags – Generate metatags for a URL using AI
export async function POST(req: NextRequest) {
  const searchParams = getSearchParams(req.url);
  const { workspaceId } = searchParams;
  const workspace = await getWorkspaceViaEdge(workspaceId);

  // this endpoint is only available for paid plans
  if (!workspace || workspace.plan === "free") {
    return new Response("Requires higher plan", { status: 403 });
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

    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
