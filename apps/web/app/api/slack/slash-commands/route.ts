import { handleSlashCommand } from "@/lib/integrations/slack/commands";
import { NextResponse } from "next/server";

// Slack will send an HTTP POST request information to this URL when a user run the slash command
export const POST = async (req: Request) => {
  return NextResponse.json(await handleSlashCommand(req));
};
