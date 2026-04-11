import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const trackLeadSearchParams = new URLSearchParams({
    appId: "id123",
    partnerEventId: "lead",
    clickId: "OcDa0EUdcs2XcRU6",
    eventName: "Signup",
    customerExternalId: "af+customer+10",
  });

  const trackSaleSearchParams = new URLSearchParams({
    appId: "id123",
    partnerEventId: "sale",
    customerExternalId: "af+customer+10",
    amount: "2900",
    currency: "usd",
    eventName: "Purchase",
  });

  console.log({
    trackLead: `${APP_DOMAIN_WITH_NGROK}/api/appsflyer/webhook?${trackLeadSearchParams.toString()}`,
    trackSale: `${APP_DOMAIN_WITH_NGROK}/api/appsflyer/webhook?${trackSaleSearchParams.toString()}`,
  });
}

main();
