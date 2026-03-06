import {
  buildSystemPrompt,
  GlobalChatContext,
} from "@/lib/ai/build-system-prompt";
import { createSupportTicketTool } from "@/lib/ai/create-support-ticket";
import { findRelevantDocsTool } from "@/lib/ai/find-relevant-docs";
import { getProgramPerformanceTool } from "@/lib/ai/get-program-performance";
import { getWorkspaceDetailsTool } from "@/lib/ai/get-workspace-details";
import { requestSupportTicketTool } from "@/lib/ai/request-support-ticket";
import { withSession } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash/ratelimit";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";

export const POST = withSession(async ({ req, session }) => {
  const body = await req.json();
  const { messages, globalContext } = body as {
    messages: UIMessage[];
    globalContext?: GlobalChatContext;
  };

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

  const { success } = await ratelimit(5, "30 s").limit(
    `support-chat:${session.user.id}`,
  );
  if (!success) {
    return new Response("Don't DDoS me pls 🥺", { status: 429 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: buildSystemPrompt(globalContext),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      findRelevantDocs: findRelevantDocsTool,
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
  });

  return result.toUIMessageStreamResponse();
});
