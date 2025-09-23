import { trackLead } from "@/lib/api/conversions/track-lead";
import { TrackLeadResponse, WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getHubSpotContact } from "./get-contact";
import { getHubSpotDeal } from "./get-deal";
import { hubSpotLeadEventSchema } from "./schema";
import { HubSpotAuthToken, HubSpotContact } from "./types";
import { updateHubSpotContact } from "./update-contact";

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

  // A new contact is created (deferred lead tracking)
  if (objectTypeId === "0-1") {
    const contactInfo = await getHubSpotContact({
      contactId: objectId,
      accessToken: authToken.access_token,
    });

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
          accessToken: authToken.access_token,
        }),
      );
    }

    return trackLeadResult;
  }

  // A deal is created for the contact (Eg: lead is tracked)
  if (objectTypeId === "0-3") {
    const deal = await getHubSpotDeal({
      dealId: objectId,
      accessToken: authToken.access_token,
    });

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
    const contactInfo = await getHubSpotContact({
      contactId: contact.id,
      accessToken: authToken.access_token,
    });

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
          accessToken: authToken.access_token,
        }),
      );
    }

    return trackLeadResult;
  }
};

// Update the HubSpot contact with `dub_link` and `dub_partner_email`
export const _updateHubSpotContact = async ({
  accessToken,
  contact,
  trackLeadResult,
}: {
  accessToken: string;
  contact: HubSpotContact;
  trackLeadResult: TrackLeadResponse;
}) => {
  if (contact.properties.dub_link && contact.properties.dub_partner_email) {
    console.log(
      `[HubSpot] Contact ${contact.id} already has dub_link and dub_partner_email. Skipping update.`,
    );
    return;
  }

  let partnerEmail = "";
  let partnerLink = "";

  if (trackLeadResult.link?.partnerId) {
    const partner = await prisma.partner.findUniqueOrThrow({
      where: {
        id: trackLeadResult.link.partnerId,
      },
      select: {
        email: true,
      },
    });

    partnerEmail = partner.email ?? "";
  }

  if (trackLeadResult.link?.url) {
    partnerLink = trackLeadResult.link.url;
  }

  if (!partnerLink && !partnerEmail) {
    return;
  }

  await updateHubSpotContact({
    contactId: contact.id,
    accessToken,
    properties: {
      dub_partner_email: partnerEmail,
      dub_link: partnerLink,
    },
  });
};
