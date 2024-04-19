import { anthropic } from "@/lib/anthropic";
import prisma from "@/lib/prisma";
import { createAI, getMutableAIState, render } from "ai/rsc";
import { z } from "zod";

// An example of a spinner component. You can also import your own components,
// or 3rd party component libraries.
function Spinner() {
  return <div>Loading...</div>;
}

// An example of a flight card component.
function AvailableTags({ availableTags }) {
  return (
    <div>
      <h2>Available tags</h2>
      <ul>
        {availableTags.map((tag) => (
          <li key={tag.id}>{tag.name}</li>
        ))}
      </ul>
    </div>
  );
}

async function submitUserMessage(userInput: string) {
  "use server";

  const aiState = getMutableAIState<typeof AI>();

  // Update the AI state with the new user message.
  aiState.update([
    ...aiState.get(),
    {
      role: "user",
      content: userInput,
    },
  ]);

  // The `render()` creates a generated, streamable UI.
  const ui = render({
    model: "claude-3-sonnet-20240229",
    provider: anthropic,
    messages: aiState.get(),
    // `text` is called when an AI returns a text response (as opposed to a tool call).
    // Its content is streamed from the LLM, so this function will be called
    // multiple times with `content` being incremental.
    text: ({ content, done }) => {
      // When it's the final content, mark the state as done and ready for the client to access.
      if (done) {
        aiState.done([
          ...aiState.get(),
          {
            role: "assistant",
            content,
          },
        ]);
      }

      return <p>{content}</p>;
    },
    tools: {
      get_relevant_tags: {
        description: "Get relevant tags for a given link",
        parameters: z
          .object({
            workspaceId: z.string(),
            url: z.string(),
            title: z.string(),
            description: z.string(),
          })
          .required(),
        render: async function* ({ workspaceId, url, title, description }) {
          // Show a spinner on the client while we wait for the response.
          yield <Spinner />;

          // Get available tags for a given workspace
          const availableTags = await prisma.tag.findMany({
            where: {
              projectId: workspaceId,
            },
            select: {
              id: true,
              name: true,
              color: true,
            },
            orderBy: {
              name: "asc",
            },
          });

          // Update the final AI state.
          aiState.done([
            ...aiState.get(),
            {
              role: "function",
              name: "get_relevant_tags",
              // Content can be any string to provide context to the LLM in the rest of the conversation.
              content: JSON.stringify(availableTags),
            },
          ]);

          // Return the available tags to the client.
          return <AvailableTags availableTags={availableTags} />;
        },
      },
    },
  });

  return {
    id: Date.now(),
    display: ui,
  };
}

// Define the initial state of the AI. It can be any JSON object.
const initialAIState: {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  id?: string;
  name?: string;
}[] = [];

// The initial UI state that the client will keep track of, which contains the message IDs and their UI nodes.
const initialUIState: {
  id: number;
  display: React.ReactNode;
}[] = [];

// AI is a provider you wrap your application with so you can access AI and UI state in your components.
export const AI = createAI({
  actions: {
    submitUserMessage,
  },
  // Each state can be any shape of object, but for chat applications
  // it makes sense to have an array of messages. Or you may prefer something like { id: number, messages: Message[] }
  initialUIState,
  initialAIState,
});
