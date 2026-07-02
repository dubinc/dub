import {
  buildSystemPrompt,
  GlobalChatContext,
} from "@/lib/ai/build-system-prompt";
import { createSupportTicketTool } from "@/lib/ai/create-support-ticket";
import { findRelevantDocsTool } from "@/lib/ai/find-relevant-docs";
import { getPlanComparisonTool } from "@/lib/ai/get-plan-comparison";
import { getProgramPerformanceTool } from "@/lib/ai/get-program-performance";
import { getWorkspaceDetailsTool } from "@/lib/ai/get-workspace-details";
import { requestSupportTicketTool } from "@/lib/ai/request-support-ticket";
import { withSession } from "@/lib/auth";
import { getSlackClient } from "@/lib/slack/client";
import { ratelimit } from "@/lib/upstash/ratelimit";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";

export const POST = withSession(async ({ req, session }) => {
  const body = await req.json();
  const { messages, globalContext } = body as {
    messages: UIMessage[];
    globalContext?: GlobalChatContext;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 });
  }

  const MAX_ATTACHMENTS = 5;
  const MAX_ATTACHMENT_ID_LENGTH = 128;
  const rawAttachmentIds = body.attachmentIds;
  if (rawAttachmentIds !== undefined) {
    if (
      !Array.isArray(rawAttachmentIds) ||
      rawAttachmentIds.length > MAX_ATTACHMENTS ||
      rawAttachmentIds.some(
        (id) => typeof id !== "string" || id.length > MAX_ATTACHMENT_ID_LENGTH,
      )
    ) {
      return new Response("Invalid attachmentIds", { status: 400 });
    }
  }
  const attachmentIds: string[] | undefined = rawAttachmentIds;

  if (
    body.ticketDetails !== undefined &&
    typeof body.ticketDetails !== "string"
  ) {
    return new Response("Invalid ticketDetails", { status: 400 });
  }
  const ticketDetails: string | undefined = body.ticketDetails?.slice(0, 4982);

  if (
    body.slackThreadTs !== undefined &&
    (typeof body.slackThreadTs !== "string" || body.slackThreadTs.length > 64)
  ) {
    return new Response("Invalid slackThreadTs", { status: 400 });
  }
  const incomingSlackThreadTs: string | undefined = body.slackThreadTs;

  const { success } = await ratelimit(5, "30 s").limit(
    `support-chat:${session.user.id}`,
  );
  if (!success) {
    return new Response("Don't DDoS me pls 🥺", { status: 429 });
  }

  const slackChannel = "C0BECQ3GNKH";
  let slackThreadTs = incomingSlackThreadTs;
  let slackUserPostPromise: Promise<string | undefined> | undefined;

  const latestParts = Array.isArray(messages[messages.length - 1].parts)
    ? messages[messages.length - 1].parts
    : [];
  const latestUserText = latestParts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p != null &&
        typeof p === "object" &&
        p.type === "text" &&
        typeof p.text === "string",
    )
    .map((p) => p.text)
    .join("\n\n");
  const userLabel = session.user.name || session.user.email || "Unknown user";
  const safeUserText = escapeSlackMrkdwn(latestUserText);
  const safeUserLabel = escapeSlackMrkdwn(userLabel);
  const safeUserEmail = escapeSlackMrkdwn(session.user.email);

  if (!slackThreadTs) {
    slackUserPostPromise = postSupportChatMessage({
      channel: slackChannel,
      text: [
        `:speech_balloon: *New AI Support Chat*`,
        ...getAccountContextLines(globalContext),
        `${safeUserLabel} (${safeUserEmail})`,
        "",
        `${safeUserLabel}: ${safeUserText}`,
      ].join("\n"),
    }).then((ts) => {
      if (ts) slackThreadTs = ts;
      return ts;
    });
  } else {
    slackUserPostPromise = postSupportChatMessage({
      channel: slackChannel,
      threadTs: slackThreadTs,
      text: `*${safeUserLabel}:* ${safeUserText}`,
    });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(globalContext),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      findRelevantDocs: findRelevantDocsTool,
      getPlanComparison: getPlanComparisonTool,
      getProgramPerformance: getProgramPerformanceTool,
      getWorkspaceDetails: getWorkspaceDetailsTool,
      requestSupportTicket: requestSupportTicketTool,
      createSupportTicket: createSupportTicketTool({
        session,
        messages: messages.map((msg) => ({
          role: msg.role,
          parts: "parts" in msg ? msg.parts : [],
        })),
        globalContext: globalContext || {},
        attachmentIds,
        ticketDetails,
      }),
    },
    onFinish: async ({ text }) => {
      if (!slackChannel || !text || !slackUserPostPromise) return;

      const threadTs = await slackUserPostPromise;
      if (!threadTs) return;

      await postSupportChatMessage({
        channel: slackChannel,
        threadTs,
        text: `*Dub AI:*\n${markdownToSlackMrkdwn(escapeSlackMrkdwn(text))}`,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "start" && incomingSlackThreadTs) {
        return { slackThreadTs: incomingSlackThreadTs };
      }
      if (part.type === "finish" && slackThreadTs) {
        return { slackThreadTs };
      }
    },
  });
});

const postSupportChatMessage = async ({
  channel,
  threadTs,
  text,
}: {
  channel: string;
  threadTs?: string;
  text: string;
}): Promise<string | undefined> => {
  try {
    const slack = getSlackClient();
    const res = await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: text.slice(0, 3000),
      unfurl_links: false,
    });
    return threadTs ?? (res.ts as string | undefined);
  } catch (e) {
    console.error("[Slack] Failed to post support chat message", e);
    return threadTs;
  }
};

const escapeSlackMrkdwn = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const getAccountContextLines = (globalContext?: GlobalChatContext) => {
  if (globalContext?.selectedWorkspace) {
    const { name, slug } = globalContext.selectedWorkspace;
    return [
      `:briefcase: *Workspace* - ${escapeSlackMrkdwn(name)} (${escapeSlackMrkdwn(slug)})`,
    ];
  }

  if (globalContext?.selectedProgram) {
    const { name, slug } = globalContext.selectedProgram;
    return [
      `:handshake: *Partners* - ${escapeSlackMrkdwn(name)} (${escapeSlackMrkdwn(slug)})`,
    ];
  }

  return [escapeSlackMrkdwn(globalContext?.chatLocation ?? "Unknown context")];
};

const markdownToSlackMrkdwn = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>")
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/__([^_]+)__/g, "*$1*")
    .replace(/~~([^~]+)~~/g, "~$1~")
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/^[*+]\s+/gm, "- ")
    .trim();
