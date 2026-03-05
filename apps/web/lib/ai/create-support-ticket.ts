import { createPlainThread } from "@/lib/plain/create-plain-thread";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
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
      const { accountType, selectedWorkspace, selectedProgram, chatLocation } =
        globalContext;

      const chatHistory = messages
        .map((msg) => {
          const text = msg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");
          return `${msg.role === "user" ? "User" : "Dub Support"}: ${text}`;
        })
        .join("\n\n");

      const { priority, additionalMetadata } = await getPriorityAndMetadata(
        accountType,
        selectedWorkspace,
        selectedProgram,
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
  accountType: "workspace" | "partner" | undefined,
  selectedWorkspace: GlobalChatContext["selectedWorkspace"],
  selectedProgram: GlobalChatContext["selectedProgram"],
  userId: string,
): Promise<{
  priority: number;
  additionalMetadata: Record<string, string>;
}> {
  let priority = 3;
  const additionalMetadata: Record<string, string> = {};

  if (accountType === "workspace" && selectedWorkspace?.slug) {
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
  } else if (accountType === "partner" && selectedProgram?.slug) {
    try {
      const [enrollmentResult, payoutsSum] = await Promise.all([
        prisma.programEnrollment.findFirst({
          where: {
            partner: {
              users: { some: { userId } },
            },
            program: { slug: selectedProgram.slug },
          },
          include: {
            program: {
              include: {
                groups: { where: { slug: "default" } },
              },
            },
            partnerGroup: true,
          },
        }),
        prisma.payout.aggregate({
          where: {
            partner: {
              users: { some: { userId } },
            },
            status: {
              in: ["processing", "processed", "sent", "completed"],
            },
          },
          _sum: { amount: true },
        }),
      ]);

      const partnerLifetimePayouts = payoutsSum._sum?.amount ?? 0;

      if (partnerLifetimePayouts > 10_000_00) {
        priority = 0;
      } else if (partnerLifetimePayouts > 1_000_00) {
        priority = 1;
      } else if (partnerLifetimePayouts > 100_00) {
        priority = 2;
      }

      if (enrollmentResult) {
        const { program, partnerGroup } = enrollmentResult;
        const holdingPeriodDays =
          partnerGroup?.holdingPeriodDays ??
          program.groups[0]?.holdingPeriodDays ??
          0;
        Object.assign(additionalMetadata, {
          "Program Name": program.name,
          "Program Slug": program.slug,
          ...(program.supportEmail
            ? { "Program Support Email": program.supportEmail }
            : {}),
          "Program Holding Period Days": holdingPeriodDays.toString(),
          "Program Min Payout Amount": program.minPayoutAmount.toString(),
          "Partner Lifetime Payouts": currencyFormatter(partnerLifetimePayouts),
        });
      }
    } catch {
      // leave priority at 3 and additionalMetadata empty
    }
  }

  return { priority, additionalMetadata };
}
