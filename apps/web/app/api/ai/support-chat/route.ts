import { ratelimit } from "@/lib/upstash/ratelimit";
import { vectorIndex } from "@/lib/upstash/vector";
import { anthropic } from "@ai-sdk/anthropic";
import { SupportChatContext } from "@/ui/support/types";
import { convertToModelMessages, jsonSchema, stepCountIs, streamText, tool, UIMessage } from "ai";
import { getSession } from "@/lib/auth/utils";
import { createPlainThread } from "@/lib/plain/create-plain-thread";
import { ComponentDividerSpacingSize } from "@team-plain/typescript-sdk";

const CONTEXT_SYSTEM_PROMPTS: Record<SupportChatContext, string> = {
  app: `You are a helpful Dub support assistant helping users manage their Dub workspaces and links.
Focus on: link shortening, custom domains, analytics, click tracking, API usage, workspace management, billing, and integrations.
When a user has a billing issue, account access problem, or a bug that can't be resolved through documentation, use the createSupportTicket tool.`,

  partners: `You are a helpful Dub Partners support assistant helping affiliate partners with their programs.
Focus on: payouts, referral tracking, commission structure, partner links, bank account setup, payout countries, program enrollment, and affiliate performance.
When a user has a payout dispute, tax compliance issue, or a problem that can't be resolved through documentation, use the createSupportTicket tool.
Always try to provide the program's support email for program-specific issues.`,

  docs: `You are a helpful Dub developer support assistant helping developers integrate Dub into their applications.
Focus on: SDK installation and usage, webhooks, conversion tracking, rate limits, API authentication, link creation, analytics API, and integration guides.
When a user has a complex integration issue that can't be resolved through documentation, use the createSupportTicket tool.`,
};

const BASE_SYSTEM_PROMPT = `
You are powered by Dub's documentation and help articles. Always ground your answers in the retrieved content.
Respond in concise, clear markdown. Do not use headings in your responses.
If you find a relevant article, include a link to it in your response.
If you cannot find relevant information in the docs, acknowledge it and offer to create a support ticket.
Never make up information — if unsure, say so and offer to escalate.
`.trim();

function buildSystemPrompt(context: SupportChatContext): string {
  return [CONTEXT_SYSTEM_PROMPTS[context], BASE_SYSTEM_PROMPT].join("\n\n");
}

export const POST = async (req: Request) => {
  const { messages, context = "app" } = (await req.json()) as {
    messages: UIMessage[];
    context?: SupportChatContext;
  };

  let userId: string | undefined;
  let userEmail: string | null = null;
  let userName: string | null = null;

  const session = await getSession();
  if (!session?.user.id) {
    return new Response("Unauthorized: Please log in to access support.", {
      status: 401,
    });
  }
  userId = session.user.id;
  userEmail = session.user.email;
  userName = session.user.name;

  const { success } = await ratelimit(5, "30 s").limit(
    `support-chat:${userId}`,
  );
  if (!success) {
    return new Response("Too many requests.", { status: 429 });
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const queryText = lastUserMessage
    ? lastUserMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join(" ")
    : "";

  let contextChunks = "";
  if (queryText) {
    try {
      const results = await vectorIndex.query({
        data: queryText,
        topK: 8,
        includeMetadata: true,
      });

      if (results.length > 0) {
        contextChunks = results
          .map((r) => {
            const meta = r.metadata as {
              url?: string;
              heading?: string;
              content?: string;
            };
            return [
              meta.heading ? `### ${meta.heading}` : "",
              meta.content || "",
              meta.url ? `Source: ${meta.url}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n---\n\n");
      }
    } catch (err) {
      console.error("Vector search error:", err);
    }
  }

  const systemPrompt = contextChunks
    ? `${buildSystemPrompt(context)}\n\n## Relevant Documentation\n\n${contextChunks}`
    : buildSystemPrompt(context);

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      createSupportTicket: tool({
        description:
          "Creates a support ticket in Plain when the AI cannot resolve the user's issue. Use this when the user explicitly asks to speak with a human, when the issue involves billing disputes, account access problems, or confirmed bugs.",
        inputSchema: jsonSchema<{
          summary: string;
          category: "billing" | "account" | "bug" | "feature" | "other";
        }>({
          type: "object",
          properties: {
            summary: {
              type: "string",
              description:
                "A concise summary of the user's issue based on the conversation.",
            },
            category: {
              type: "string",
              enum: ["billing", "account", "bug", "feature", "other"],
              description: "The category of the support request.",
            },
          },
          required: ["summary", "category"],
        }),
        execute: async ({ summary, category }) => {
          if (!userId || !userEmail) {
            return {
              success: false,
              message:
                "Support ticket creation requires login. Please log in and try again.",
            };
          }

          const chatHistory = messages
            .map((msg) => {
              const text = msg.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("");
              return `${msg.role === "user" ? "User" : "Dub Support"}: ${text}`;
            })
            .join("\n\n");

          try {
            await createPlainThread({
              user: {
                id: userId,
                name: userName,
                email: userEmail,
              },
              title: `[${context.toUpperCase()}] ${summary.slice(0, 80)}`,
              priority: 2,
              components: [
                {
                  componentText: {
                    text: `**Category:** ${category}\n\n**Summary:** ${summary}`,
                  },
                },
                {
                  componentDivider: {
                    dividerSpacingSize: ComponentDividerSpacingSize.L,
                  },
                },
                {
                  componentText: {
                    text: chatHistory.slice(0, 5000),
                  },
                },
              ],
            });

            return {
              success: true,
              message:
                "Support ticket created successfully. Our team will reach out to you shortly.",
            };
          } catch (err) {
            console.error("Failed to create support ticket:", err);
            return {
              success: false,
              message:
                "Failed to create support ticket. Please try again or email support@dub.co.",
            };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
};
