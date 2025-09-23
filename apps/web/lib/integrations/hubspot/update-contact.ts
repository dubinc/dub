import { HUBSPOT_API_HOST } from "./constants";

export async function updateHubSpotContact({
  contactId,
  accessToken,
  properties,
}: {
  contactId: number | string;
  accessToken: string;
  properties: {
    dub_link?: string;
    dub_partner_email?: string;
  };
}) {
  if (Object.keys(properties).length === 0) {
    return null;
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Updating HubSpot contact ${contactId} with properties`,
        properties,
      );
    }

    const response = await fetch(
      `${HUBSPOT_API_HOST}/crm/v3/objects/contacts/${contactId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties,
        }),
      },
    );

    const result = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("HubSpot contact update result", result);
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to update contact");
    }

    return result;
  } catch (error) {
    console.error(`[HubSpot] Failed to update contact ${contactId}: ${error}`);
    throw error;
  }
}
