import { trackSale } from "@/lib/api/conversions/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { HubSpotApi } from "./api";
import { HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID } from "./constants";
import { hubSpotSaleEventSchema } from "./schema";
import { HubSpotAuthToken } from "./types";

export const trackHubSpotSaleEvent = async ({
  payload,
  workspace,
  authToken,
  closedWonDealStageId,
}: {
  payload: Record<string, any>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  authToken: HubSpotAuthToken;
  closedWonDealStageId?: string | null;
}) => {
  closedWonDealStageId =
    closedWonDealStageId ?? HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID;

  const { objectId, subscriptionType, propertyName, propertyValue } =
    hubSpotSaleEventSchema.parse(payload);

  if (subscriptionType !== "object.propertyChange") {
    console.log(`[HubSpot] Unknown subscriptionType ${subscriptionType}`);
    return;
  }

  if (propertyName !== "dealstage") {
    console.log(
      `[HubSpot] Unknown propertyName ${propertyName}. Expected dealstage.`,
    );
    return;
  }

  if (propertyValue !== closedWonDealStageId) {
    console.error(
      `[HubSpot] Unknown propertyValue ${propertyValue}. Expected ${closedWonDealStageId}.`,
    );
    return;
  }

  const hubSpotApi = new HubSpotApi({
    token: authToken.access_token,
  });

  const deal = await hubSpotApi.getDeal(objectId);

  if (!deal) {
    return;
  }

  const { id: dealId, properties, associations } = deal;

  if (!properties.amount) {
    console.error(`[HubSpot] Amount is not set for deal ${dealId}`);
    return;
  }

  // Find the contact associated with the deal
  const contact = associations?.contacts?.results?.[0];

  if (!contact) {
    console.error(`[HubSpot] No contact associated with deal ${dealId}`);
    return;
  }

  // HubSpot doesn't return the contact properties in the deal associations,
  // so we need to get it separately
  const contactInfo = await hubSpotApi.getContact(contact.id);

  if (!contactInfo) {
    return;
  }

  return await trackSale({
    customerExternalId: contactInfo.properties.email,
    amount: Number(properties.amount) * 100,
    eventName: `${properties.dealname} ${properties.dealstage}`,
    paymentProcessor: "custom",
    invoiceId: dealId,
    workspace,
    rawBody: deal,
  });
};
