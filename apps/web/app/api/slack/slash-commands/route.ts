import { handleSlashCommand } from "@/lib/integrations/slack/slash-commands";

// Slack will send an HTTP POST request information to this URL when a user run the slash command
export const POST = async (req: Request) => {
  const { text } = await handleSlashCommand(req);

  return new Response(text);
};
