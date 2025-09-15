import { trackLead } from "@/lib/api/conversions/track-lead";
import { WorkspaceProps } from "@/lib/types";
import { z } from "zod";
import { HUBSPOT_OBJECT_TYPE_IDS } from "./constants";
import { getContact } from "./get-contact";
import { HubSpotAuthToken } from "./types";

const hubSpotLeadEventSchema = z.object({
  objectId: z.number(),
  subscriptionType: z.enum(["object.creation"]),
  objectTypeId: z.enum(HUBSPOT_OBJECT_TYPE_IDS as [string, ...string[]]),
});

export const trackHubSpotLeadEvent = async ({
  payload,
  workspace,
  authToken,
  mode,
}: {
  payload: Record<string, any>;
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId" | "webhookEnabled">;
  authToken: HubSpotAuthToken;
  mode: "async" | "deferred";
}) => {
  const { objectId, objectTypeId, subscriptionType } =
    hubSpotLeadEventSchema.parse(payload);

  if (subscriptionType !== "object.creation" || objectTypeId !== "0-1") {
    console.log(
      `Unsupported subscriptionType or objectTypeId: ${subscriptionType} ${objectTypeId}`,
    );
    return;
  }

  // Get the contact from HubSpot
  const contact = await getContact({
    contactId: objectId,
    accessToken: authToken.access_token,
  });

  if (!contact) {
    console.error(`Contact not found for objectId: ${objectId}`);
    return;
  }

  const { properties } = contact;

  const customerName =
    [properties.firstname, properties.lastname].filter(Boolean).join(" ") ||
    null;

  return await trackLead({
    clickId: properties.dub_id || "",
    eventName: "Sign up",
    customerEmail: properties.email,
    customerExternalId: contact.id,
    customerName,
    mode,
    workspace,
    rawBody: payload,
  });
};
