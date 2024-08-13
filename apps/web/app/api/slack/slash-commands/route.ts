import { handleCreateShortLink } from "@/lib/integration/slack/slash-commands";

// Slack will send an HTTP POST request information to this URL when a user run the command /shorten <url> <key>
export const POST = async (req: Request) => {
  const { text } = await handleCreateShortLink(req);

  return new Response(text);
};
