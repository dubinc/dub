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

  const { url, domain } = await req.json();

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
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant and only answer in short link keys, e.g. you receive a question like 'What is the shortlink for https://dub.dev/docs on dub.dev?' and you respond with 'docs'. If there are paths in the URL, you should ignore them and try to combine them in a shortlink that makes sense and is easy to share on social media.",
        },
        {
          role: "user",
          content: `What is the shortlink for ${url} on ${domain}?`,
        },
      ],
    });

    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
