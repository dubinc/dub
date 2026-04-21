import { trackSale } from "@/lib/api/conversions/track-sale";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
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
    return `Unknown subscriptionType ${subscriptionType}.`;
  }

  if (propertyName !== "dealstage") {
    return `Unknown propertyName ${propertyName}. Expected dealstage.`;
  }

  if (
    propertyValue.toLowerCase() !== settings.closedWonDealStageId?.toLowerCase()
  ) {
    return `Unknown propertyValue ${propertyValue}. Expected ${settings.closedWonDealStageId}.`;
  }

  const hubSpotApi = new HubSpotApi({
    token: authToken.access_token,
  });

  const deal = await hubSpotApi.getDeal(objectId);

  if (!deal) {
    return `No deal found for deal ${objectId}`;
  }

  const { id: dealId, properties, associations } = deal;

  if (!properties.amount) {
    return `Amount is not set for deal ${dealId}`;
  }

  // Find the contact associated with the deal
  const contact = associations?.contacts?.results?.[0];

  if (!contact) {
    return `No contact associated with deal ${dealId}`;
  }

  // HubSpot doesn't return the contact properties in the deal associations,
  // so we need to get it separately
  const contactInfo = await hubSpotApi.getContact(contact.id);

  if (!contactInfo) {
    return `No contact info found for contact ${contact.id}`;
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
    return `No customer found for contact ID ${contactInfo.id} or email ${contactInfo.properties.email}.`;
  }

  await trackSale({
    customerExternalId: customer.externalId!,
    amount: Number(properties.amount) * 100,
    eventName: `${properties.dealname} ${properties.dealstage}`,
    paymentProcessor: "custom",
    invoiceId: dealId,
    workspace,
    rawBody: deal,
    metadata: {},
  });

  return `Sale tracked for deal ${dealId}.`;
};
