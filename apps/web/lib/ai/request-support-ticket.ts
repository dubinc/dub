import { tool } from "ai";
import { z } from "zod";

export const requestSupportTicketTool = tool({
  description:
    "Shows a file upload form inside the chat so the user can optionally attach screenshots or files before a support ticket is created. ALWAYS call this tool first when the user asks to create a support ticket or speak with a human — never call createSupportTicket directly. IMPORTANT: After calling this tool, do NOT write any additional text — the form is self-explanatory and appears automatically in the chat. After the user clicks 'Submit ticket' in the form (they will send a follow-up confirmation message), call createSupportTicket to finalize the ticket.",
  inputSchema: z.object({}),
  execute: async () => ({ status: "ready" as const }),
});
