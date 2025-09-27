import { trackLead } from "@/lib/api/conversions/track-lead";
import { TrackLeadResponse, WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { HubSpotAuthToken, HubSpotContact } from "../types";
import { HubSpotApi } from "./api";
import { hubSpotLeadEventSchema } from "./schema";

export const trackHubSpotLeadEvent = async ({
  payload,
  workspace,
  authToken,
}: {
  payload: Record<string, any>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  authToken: HubSpotAuthToken;
}) => {
  const { objectId, objectTypeId } = hubSpotLeadEventSchema.parse(payload);

  const hubSpotApi = new HubSpotApi({
    token: authToken.access_token,
  });

  // A new contact is created (deferred lead tracking)
  if (objectTypeId === "0-1") {
    const contactInfo = await hubSpotApi.getContact(objectId);

    if (!contactInfo) {
      return;
    }

    const { properties } = contactInfo;

    if (!properties.dub_id) {
      console.error(`[HubSpot] No dub_id found for contact ${objectId}.`);
      return;
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
      rawBody: payload,
    });

    if (trackLeadResult) {
      waitUntil(
        _updateHubSpotContact({
          contact: contactInfo,
          trackLeadResult,
          hubSpotApi,
        }),
      );
    }

    return trackLeadResult;
  }

  // A deal is created for the contact (Eg: lead is tracked)
  if (objectTypeId === "0-3") {
    const deal = await hubSpotApi.getDeal(objectId);

    if (!deal) {
      return;
    }

    const { properties, associations } = deal;

    // Find the contact associated with the deal
    const contact = associations?.contacts?.results?.[0];

    if (!contact) {
      return;
    }

    // HubSpot doesn't return the contact properties in the deal associations,
    // so we need to get it separately
    const contactInfo = await hubSpotApi.getContact(contact.id);

    if (!contactInfo) {
      return;
    }

    const trackLeadResult = await trackLead({
      clickId: "",
      eventName: `Deal ${properties.dealstage}`,
      customerExternalId: contactInfo.properties.email,
      customerName: `${contactInfo.properties.firstname} ${contactInfo.properties.lastname}`,
      customerEmail: contactInfo.properties.email,
      mode: "async",
      workspace,
      rawBody: payload,
    });

    if (trackLeadResult) {
      waitUntil(
        _updateHubSpotContact({
          contact: contactInfo,
          trackLeadResult,
          hubSpotApi,
        }),
      );
    }

    return trackLeadResult;
  }
};

// Update the HubSpot contact with `dub_link` and `dub_partner_email`
export const _updateHubSpotContact = async ({
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
    return;
  }

  await hubSpotApi.updateContact({
    contactId: contact.id,
    properties,
  });
};
