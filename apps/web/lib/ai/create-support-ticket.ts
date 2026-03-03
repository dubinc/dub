import { createPlainThread } from "@/lib/plain/create-plain-thread";
import { SupportChatContext } from "@/ui/support/types";
import { ComponentDividerSpacingSize } from "@team-plain/typescript-sdk";
import { tool } from "ai";
import { z } from "zod";
import { Session } from "../auth/utils";

const createSupportTicketInputSchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise summary of the user's issue based on the conversation.",
    ),
  category: z
    .enum(["billing", "account", "bug", "feature", "other"])
    .describe("The category of the support request."),
});

export type CreateSupportTicketOptions = {
  context: SupportChatContext;
  session: Session;
  messages: Array<{
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>;
};

export function createSupportTicketTool(options: CreateSupportTicketOptions) {
  const { context, session, messages } = options;

  return tool({
    description:
      "Creates a support ticket in Plain when the AI cannot resolve the user's issue. Use this when the user explicitly asks to speak with a human, when the issue involves billing disputes, account access problems, or confirmed bugs.",
    inputSchema: createSupportTicketInputSchema,
    execute: async ({ summary, category }) => {
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
            id: session.user.id,
            name: session.user.name ?? "",
            email: session.user.email,
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
  });
}
