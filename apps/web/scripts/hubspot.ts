import "dotenv-flow/config";
import { hubSpotEnv } from "@/lib/integrations/hubspot/env";
import { nanoid } from "@dub/utils";

async function main() {
  const SCOPES = [
    "oauth",
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.leads.read",
    "crm.objects.deals.read",
  ];

  const REDIRECT_URI =
    "https://accurate-caribou-strictly.ngrok-free.app/api/hubspot/callback";

  const authUrl =
    "https://app.hubspot.com/oauth/authorize" +
    `?client_id=${encodeURIComponent(hubSpotEnv.HUBSPOT_CLIENT_ID)}` +
    `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${encodeURIComponent(nanoid(10))}`;

  console.log(authUrl);

  return;
}

main();
