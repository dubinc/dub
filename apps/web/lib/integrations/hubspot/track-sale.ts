import { trackSale } from "@/lib/api/conversions/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { HubSpotAuthToken } from "../types";
import { HubSpotApi } from "./api";
import { hubSpotSaleEventSchema, hubSpotSettingsSchema } from "./schema";

export const trackHubSpotSaleEvent = async ({
  payload,
  workspace,
  authToken,
  settings,
}: {
  payload: Record<string, any>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  authToken: HubSpotAuthToken;
  settings: z.infer<typeof hubSpotSettingsSchema>;
}) => {
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

  if (propertyValue !== settings.closedWonDealStageId) {
    console.error(
      `[HubSpot] Unknown propertyValue ${propertyValue}. Expected ${settings.closedWonDealStageId}.`,
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

  const customer = await prisma.customer.findFirst({
    where: {
      projectId: workspace.id,
      OR: [
        { externalId: contactInfo.id },
        { externalId: contactInfo.properties.email },
      ],
    },
  });

  if (!customer) {
    console.error(
      `[HubSpot] No customer found for contact ID ${contactInfo.id} or email ${contactInfo.properties.email}.`,
    );
    return;
  }

  return await trackSale({
    customerExternalId: customer.externalId!,
    amount: Number(properties.amount) * 100,
    eventName: `${properties.dealname} ${properties.dealstage}`,
    paymentProcessor: "custom",
    invoiceId: dealId,
    workspace,
    rawBody: deal,
  });
};
