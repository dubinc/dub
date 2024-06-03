"use server";

import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";

export async function generateSupportTitle(prompt: string) {
  const stream = createStreamableValue();

  (async () => {
    const { textStream } = await streamText({
      model: anthropic("claude-3-sonnet-20240229"),
      prompt: `Create a short but concise title that summarizes the following support request. Only return the generated title, and nothing else. Don't use quotation marks.
      
      ${prompt}`,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value };
}
