import { rebuildClickWebhookWorkspaces } from "@/lib/webhook/click-webhook-workspaces";
import "dotenv-flow/config";

async function main() {
  const count = await rebuildClickWebhookWorkspaces();
  console.log(`Rebuilt webhookClickWorkspaces with ${count} workspace(s).`);
}

main();
