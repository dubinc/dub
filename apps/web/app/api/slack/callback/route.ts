import { installSlackIntegration } from "@/lib/integration/slack/install";

export const GET = async (req: Request) => {
  await installSlackIntegration(req);
};
