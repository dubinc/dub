import { trackLead } from "@/lib/api/conversions/track-lead";
import { prisma } from "@/lib/prisma";
import { TrackLeadResponse, WorkspaceProps } from "@/lib/types";
import { CommissionSource } from "@prisma/client";
import * as z from "zod/v4";
import { HubSpotAuthToken, HubSpotContact } from "../types";
import { HubSpotApi } from "./api";
import { hubSpotLeadEventSchema, hubSpotSettingsSchema } from "./schema";

export const trackHubSpotLeadEvent = async ({
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
  const hubSpotApi = new HubSpotApi({
    token: authToken.access_token,
  });

  const {
    objectId,
    objectTypeId,
    subscriptionType,
    propertyName,
    propertyValue,
  } = hubSpotLeadEventSchema.parse(payload);

  // A new contact is created (deferred lead tracking)
  if (objectTypeId === "0-1" && subscriptionType === "object.creation") {
    const contactInfo = await hubSpotApi.getContact(objectId);

    if (!contactInfo) {
      return `No contact info found for contact ${objectId}.`;
    }

    const { properties } = contactInfo;

    if (!properties.dub_id) {
      return `No dub_id found for contact ${objectId}.`;
    }

    const customerName =
      [properties.firstname, properties.lastname].filter(Boolean).join(" ") ||
      null;

    const trackLeadResult = await trackLead({
      clickId: properties.dub_id,
      eventName: "Sign up",
      customerEmail: properties.email,
      customerExternalId: properties.email,
      customerName,
      mode: "deferred",
      workspace,
      commissionSource: CommissionSource.hubspot,
    });

    if (trackLeadResult) {
      await updateHubSpotContact({
        contact: contactInfo,
        trackLeadResult,
        hubSpotApi,
      });
    }

    return `Deferred lead tracked for contact ${objectId}.`;
  }

  // Track the final lead event
  // Case 1: A deal is created for the contact
  if (
    objectTypeId === "0-3" &&
    subscriptionType === "object.creation" &&
    settings.leadTriggerEvent === "dealCreated"
  ) {
    return trackFinalLead({
      dealId: objectId,
      workspace,
      hubSpotApi,
    });
  }

  // Track the final lead event
  // Case 3: A deal reaches the configured lead deal stage
  if (
    objectTypeId === "0-3" &&
    subscriptionType === "object.propertyChange" &&
    settings.leadTriggerEvent === "dealStageReached"
  ) {
    if (!settings.leadDealStageId) {
      return `leadDealStageId is not set.`;
    }

    if (propertyName !== "dealstage") {
      return `Unknown propertyName ${propertyName}. Expected dealstage.`;
    }

    if (
      propertyValue?.toLowerCase() !== settings.leadDealStageId.toLowerCase()
    ) {
      return `Unknown propertyValue ${propertyValue}. Expected ${settings.leadDealStageId}.`;
    }

    return trackFinalLead({
      dealId: objectId,
      workspace,
      hubSpotApi,
    });
  }

  // Track the final lead event
  // Case 2: When the contact's lifecycle stage is changed to a qualified lead
  if (
    objectTypeId === "0-1" &&
    subscriptionType === "object.propertyChange" &&
    settings.leadTriggerEvent === "lifecycleStageReached"
  ) {
    if (!settings.leadLifecycleStageId) {
      return `leadLifecycleStageId is not set.`;
    }

    const contactInfo = await hubSpotApi.getContact(objectId);

    if (!contactInfo) {
      return `No contact info found for contact ${objectId}.`;
    }

    const { properties } = contactInfo;

    if (
      properties.lifecyclestage?.toLowerCase() !==
      settings.leadLifecycleStageId?.toLowerCase()
    ) {
      return `Unknown contact lifecyclestage ${properties.lifecyclestage}. Expected ${settings.leadLifecycleStageId}.`;
    }

    if (!properties.dub_id) {
      return `No dub_id found for contact ${objectId}.`;
    }

    const customer = await prisma.customer.findFirst({
      where: {
        projectId: workspace.id,
        OR: [{ externalId: contactInfo.id }, { externalId: properties.email }],
      },
    });

    const trackLeadResult = await trackLead({
      clickId: properties.dub_id,
      eventName: `Contact ${properties.lifecyclestage}`,
      customerExternalId: customer?.externalId || properties.email,
      customerName: `${properties.firstname} ${properties.lastname}`,
      customerEmail: properties.email,
      mode: "async",
      workspace,
      commissionSource: CommissionSource.hubspot,
    });

    if (trackLeadResult) {
      await updateHubSpotContact({
        contact: contactInfo,
        trackLeadResult,
        hubSpotApi,
      });
    }

    return `Lead tracked for contact ${objectId}.`;
  }

  return `Unknown event: objectTypeId "${objectTypeId}" and subscriptionType "${subscriptionType}".`;
};

// Track the final lead for the first contact associated with a deal
const trackFinalLead = async ({
  dealId,
  workspace,
  hubSpotApi,
}: {
  dealId: number;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  hubSpotApi: HubSpotApi;
}) => {
  const deal = await hubSpotApi.getDeal(dealId);

  if (!deal) {
    return `No deal found for deal ${dealId}.`;
  }

  const { properties, associations } = deal;

  // Find the contact associated with the deal
  const contact = associations?.contacts?.results?.[0];

  if (!contact) {
    return `No contact found for deal ${dealId}.`;
  }

  // HubSpot doesn't return the contact properties in the deal associations,
  // so we need to get it separately
  const contactInfo = await hubSpotApi.getContact(contact.id);

  if (!contactInfo) {
    return `No contact info found for contact ${contact.id}.`;
  }

  const customer = await prisma.customer.findFirst({
    where: {
      projectId: workspace.id,
      OR: [
        { email: contactInfo.properties.email },
        { externalId: contactInfo.id },
        { externalId: contactInfo.properties.email },
      ],
    },
  });

  if (!customer) {
    return `No customer found for contact ID ${contactInfo.id} or email ${contactInfo.properties.email}.`;
  }

  const trackLeadResult = await trackLead({
    clickId: "",
    eventName: `Deal ${properties.dealstage}`,
    customerExternalId: customer.externalId!,
    customerName: `${contactInfo.properties.firstname} ${contactInfo.properties.lastname}`,
    customerEmail: contactInfo.properties.email,
    mode: "async",
    workspace,
    commissionSource: CommissionSource.hubspot,
  });

  if (trackLeadResult) {
    await updateHubSpotContact({
      contact: contactInfo,
      trackLeadResult,
      hubSpotApi,
    });
  }

  return `Lead tracked for deal ${dealId}.`;
};

// Update the HubSpot contact with `dub_link` and `dub_partner_email`
export const updateHubSpotContact = async ({
  hubSpotApi,
  contact,
  trackLeadResult,
}: {
  hubSpotApi: HubSpotApi;
  contact: HubSpotContact;
  trackLeadResult: TrackLeadResponse;
}) => {
  if (contact.properties.dub_link && contact.properties.dub_partner_email) {
    console.log(
      `[HubSpot] Contact ${contact.id} already has dub_link and dub_partner_email. Skipping update.`,
    );
    return;
  }

  const properties: Record<string, string> = {};

  if (trackLeadResult.link?.partnerId) {
    const partner = await prisma.partner.findUniqueOrThrow({
      where: {
        id: trackLeadResult.link.partnerId,
      },
      select: {
        email: true,
      },
    });

    if (partner.email) {
      properties["dub_partner_email"] = partner.email;
    }
  }

  if (trackLeadResult.link?.shortLink) {
    properties["dub_link"] = trackLeadResult.link.shortLink;
  }

  if (Object.keys(properties).length === 0) {
    console.log(
      `[HubSpot] No properties to update for contact ${contact.id}. Skipping update.`,
    );
    return;
  }

  await hubSpotApi.updateContact({
    contactId: contact.id,
    properties,
  });
};
