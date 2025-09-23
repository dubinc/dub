import { trackLead } from "@/lib/api/conversions/track-lead";
import { WorkspaceProps } from "@/lib/types";
import { getHubSpotContact } from "./get-contact";
import { getHubSpotDeal } from "./get-deal";
import { hubSpotLeadEventSchema } from "./schema";
import { HubSpotAuthToken } from "./types";

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
    const contact = await getHubSpotContact({
      contactId: objectId,
      accessToken: authToken.access_token,
    });

    if (!contact) {
      return;
    }

    const { properties } = contact;

    if (!properties.dub_id) {
      console.error(`[HubSpot] No dub_id found for contact ${objectId}.`);
      return;
    }

    const customerName =
      [properties.firstname, properties.lastname].filter(Boolean).join(" ") ||
      null;

    return await trackLead({
      clickId: properties.dub_id,
      eventName: "Sign up",
      customerEmail: properties.email,
      customerExternalId: properties.email,
      customerName,
      mode: "deferred",
      workspace,
      rawBody: payload,
    });
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

    return await trackLead({
      clickId: "",
      eventName: `Deal ${properties.dealstage}`,
      customerExternalId: contactInfo.properties.email,
      customerName: `${contactInfo.properties.firstname} ${contactInfo.properties.lastname}`,
      customerEmail: contactInfo.properties.email,
      mode: "async",
      workspace,
      rawBody: payload,
    });
  }
};
