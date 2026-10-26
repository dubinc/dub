import { createPlainThread } from "@/lib/plain/create-plain-thread";
import { prisma } from "@/lib/prisma";
import { ComponentDividerSpacingSize } from "@team-plain/typescript-sdk";
import { tool } from "ai";
import { z } from "zod";
import { Session } from "../auth/utils";
import { GlobalChatContext } from "./build-system-prompt";

export type CreateSupportTicketOptions = {
  session: Session;
  messages: Array<{
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>;
  globalContext: GlobalChatContext;
  attachmentIds?: string[];
  ticketDetails?: string;
};

export function createSupportTicketTool(options: CreateSupportTicketOptions) {
  const { globalContext, session, messages, attachmentIds, ticketDetails } =
    options;

  return tool({
    description:
      "Creates a support ticket in Plain when the AI cannot resolve the user's issue. Use this when the user explicitly asks to speak with a human, when the issue involves billing disputes, account access problems, or confirmed bugs.",
    inputSchema: z.object({}),
    execute: async () => {
      const { selectedWorkspace, chatLocation } = globalContext;

      const chatHistory = messages
        .map((msg) => {
          const text = msg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");
          const imageCount = msg.parts.filter((p) => p.type === "file").length;
          const imageNote =
            imageCount > 0
              ? `(${imageCount} image${imageCount === 1 ? "" : "s"} attached)`
              : "";
          const body = [text, imageNote].filter(Boolean).join(" ");
          return `${msg.role === "user" ? "User" : "Dub Support"}: ${body}`;
        })
        .join("\n\n");

      const { priority, additionalMetadata } = await getPriorityAndMetadata(
        selectedWorkspace,
        session.user.id,
      );

      const details = ticketDetails?.trim();

      const components: Array<Record<string, unknown>> = [
        ...(details
          ? [
              {
                componentText: {
                  text: `User description: ${details}`,
                },
              },
              {
                componentDivider: {
                  dividerSpacingSize: ComponentDividerSpacingSize.M,
                },
              },
            ]
          : []),
        {
          componentText: {
            text: chatHistory.slice(0, 5000),
          },
        },
      ];

      if (Object.keys(additionalMetadata).length > 0) {
        components.push(
          {
            componentDivider: {
              dividerSpacingSize: ComponentDividerSpacingSize.L,
            },
          },
          // chat location
          {
            componentRow: {
              rowMainContent: [{ componentText: { text: "Chat Location" } }],
              rowAsideContent: [{ componentText: { text: chatLocation } }],
            },
          },
          ...Object.entries(additionalMetadata).map(([key, value]) => ({
            componentRow: {
              rowMainContent: [{ componentText: { text: key } }],
              rowAsideContent: [{ componentText: { text: value } }],
            },
          })),
        );
      }

      try {
        await createPlainThread({
          user: {
            id: session.user.id,
            name: session.user.name ?? "",
            email: session.user.email,
          },
          priority,
          components,
          ...(attachmentIds?.length ? { attachmentIds } : {}),
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

async function getPriorityAndMetadata(
  selectedWorkspace: GlobalChatContext["selectedWorkspace"],
  userId: string,
): Promise<{
  priority: number;
  additionalMetadata: Record<string, string>;
}> {
  let priority = 3;
  const additionalMetadata: Record<string, string> = {};

  if (selectedWorkspace?.slug) {
    const workspace = await prisma.project.findUnique({
      where: {
        slug: selectedWorkspace.slug,
        users: {
          some: { userId },
        },
      },
    });
    if (workspace) {
      switch (workspace.plan) {
        case "enterprise":
        case "advanced":
          priority = 0;
          break;
        case "business":
          priority = 1;
          break;
        case "pro":
          priority = 2;
          break;
      }
      Object.assign(additionalMetadata, {
        "Workspace Name": workspace.name,
        "Workspace Slug": workspace.slug,
        "Workspace Plan": workspace.plan,
      });
    }
  }

  return { priority, additionalMetadata };
}
