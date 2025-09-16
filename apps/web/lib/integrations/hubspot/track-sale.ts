import { trackSale } from "@/lib/api/conversions/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { getHubSpotContact } from "./get-contact";
import { getHubSpotDeal } from "./get-deal";
import { hubSpotSaleEventSchema } from "./schema";
import { HubSpotAuthToken } from "./types";

export const trackHubSpotSaleEvent = async ({
  payload,
  workspace,
  authToken,
}: {
  payload: Record<string, any>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  authToken: HubSpotAuthToken;
}) => {
  const { objectId, subscriptionType, propertyName, propertyValue } =
    hubSpotSaleEventSchema.parse(payload);

  if (subscriptionType !== "object.propertyChange") {
    console.error(`[HubSpot] Unknown subscriptionType ${subscriptionType}`);
    return;
  }

  if (propertyName !== "dealstage") {
    console.error(`[HubSpot] Unknown propertyName ${propertyName}`);
    return;
  }

  if (propertyValue !== "closedwon") {
    console.error(`[HubSpot] Unknown propertyValue ${propertyValue}`);
    return;
  }

  const deal = await getHubSpotDeal({
    dealId: objectId,
    accessToken: authToken.access_token,
  });

  if (!deal) {
    return;
  }

  const { id: dealId, properties, associations } = deal;

  // Find the contact associated with the deal
  const contact = associations.contacts.results[0];

  if (!contact) {
    return;
  }

  // HubSpot doesn't return the contact properties in the deal associations,
  // so we need to get it separately
  const contactInfo = await getHubSpotContact({
    contactId: contact.id,
    accessToken: authToken.access_token,
  });

  if (!contactInfo) {
    return;
  }

  return await trackSale({
    customerExternalId: contactInfo.properties.email,
    amount: Number(properties.amount) * 100,
    eventName: `Deal ${properties.dealstage}`,
    paymentProcessor: "custom",
    invoiceId: dealId,
    workspace,
    rawBody: deal,
  });
};
