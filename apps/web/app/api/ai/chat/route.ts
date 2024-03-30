import { getWorkspaceViaEdge } from "@/lib/planetscale";
import { getSearchParams } from "@dub/utils";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const searchParams = getSearchParams(req.url);
  const { workspaceId } = searchParams;

  const { messages } = await req.json();

  const workspace = await getWorkspaceViaEdge(workspaceId);

  // this endpoint is only available for paid plans
  if (!workspace || workspace.plan === "free")
    return new Response("Requires higher plan", { status: 403 });

  // generates a shortlink for the given URL by asking the AI
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      max_tokens: 100,
      stream: true,
      messages,
    });

    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
