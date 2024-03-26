import OpenAI from "openai";

// Edge friendly OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: Request) {
  // TODO: Implement OpenAI API call to generate short link
}
