import "dotenv-flow/config";

import { syncClickWebhookWorkspaceSet } from "@/lib/webhook/click-webhook-workspaces";

async function main() {
  const count = await syncClickWebhookWorkspaceSet();
  console.log(`Rebuilt webhookClickWorkspaces with ${count} workspace(s).`);
}

main();
