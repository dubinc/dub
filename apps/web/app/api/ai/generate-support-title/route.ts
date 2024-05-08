import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { groq } from "@/lib/groq";
import { ratelimit } from "@/lib/upstash";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!session?.email) {
      throw new DubApiError({
        code: "unauthorized",
        message: "You must be logged in to access this resource",
      });
    }

    // you can only generate a support completion 3 times per minute
    const { success } = await ratelimit(3, "1 m").limit(
      `ai-completion:${session.sub}`,
    );
    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message: "Don't DDoS me pls 🥺",
      });
    }

    // Extract the `prompt` from the body of the request
    const { prompt } = await req.json();

    // Ask the AI to generate a support title
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Create a short but concise title that summarizes the following support request. Only return the generated title, and nothing else. Don't use quotation marks.
          
          ${prompt}`,
        },
      ],
      model: "llama3-70b-8192",
      stream: true,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
