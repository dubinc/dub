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
  const { workspaceId, type } = searchParams;

  const { metaTitle, metaDescription, doNotUseString } = await req.json();

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
          content: `You are a helpful assistant and only answer with a suitable ${type} for SEO and sharing purposes of a website based on the one you receive. For example, you receive a question like 'What is the suitable meta ${type} for meta-title Notion and meta-description The all in one workspace?' and you respond with e.g. ${type === "title" ? "Notion - The all-in-one workspace for your productivity" : "A new tool that brings together all the apps you need for your daily work in one place: The unified workspace for you and your team."}. Don't use any special characters or spaces. For ${type} the maximum length is ${type === "title" ? "120" : "240"} characters.`,
        },
        {
          role: "user",
          content: `What is the suitable meta ${type} for meta-title ${metaTitle} and meta-description ${metaDescription}?${doNotUseString ? ` Don't use ${doNotUseString}.` : ""} and only respond with a suitable ${type} without any special formatting.`,
        },
      ],
    });

    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
