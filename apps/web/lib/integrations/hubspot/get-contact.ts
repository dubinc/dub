import { HUBSPOT_API_HOST } from "./constants";
import { hubSpotContactSchema } from "./schema";

export async function getHubSpotContact({
  contactId,
  accessToken,
}: {
  contactId: number | string;
  accessToken: string;
}) {
  try {
    const response = await fetch(
      `${HUBSPOT_API_HOST}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,dub_id`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const result = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("HubSpot contact", result);
    }

    if (!response.ok) {
      throw new Error(result.message);
    }

    return hubSpotContactSchema.parse(result);
  } catch (error) {
    console.error(
      `[HubSpot] Failed to retrieve contact ${contactId}: ${error}`,
    );
    return null;
  }
}
